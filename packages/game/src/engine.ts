import type { AuctionFrame, ClientAction, DebtFrame, GameEvent, GameState, Interrupt, PlayerId, Result, TurnPhase } from "./types";
import { BAIL, BOARD } from "./board-data";
import { roll2d6, nextInt } from "./rng";
import { alive, byId, cash, charge, cur, expropriate, moveAndResolve, nextPlayer, pushAuction, seizeToBank, sendToJail, settleAuction, transfer } from "./flow";
import * as props from "./properties";
import { handleTrade } from "./trades";
import { CHANCE, CHEST } from "./cards";

type Node = TurnPhase | Interrupt;

// Accepts any state carrying phase+stack, so the client can call it on the redacted PublicState.
export const activeNode = (s: Pick<GameState, "phase" | "stack">): Node => s.stack.at(-1) ?? s.phase;

const clone = (s: GameState): GameState => structuredClone(s);
const ok = (state: GameState, events: GameEvent[] = []): Result => ({ ok: true, state, events });
const err = (error: string): Result => ({ ok: false, error });
const info = (text: string): GameEvent => ({ e: "info", text });

type Handler = (s: GameState, pid: PlayerId, a: ClientAction) => Result;

// ---- helpers ---------------------------------------------------------

function advanceTurn(s: GameState): GameState {
  const rest = alive(s);
  if (rest.length <= 1) {
    s.status = "ended";
    s.winner = rest[0]?.id;
    return s;
  }
  nextPlayer(s);
  return s;
}

// ---- preRoll ---------------------------------------------------------

const roll: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("not your turn");
  const [d1, d2] = roll2d6(s);
  const ev: GameEvent[] = [{ e: "rolled", pid, d1, d2 }];
  const doubles = d1 === d2;

  if (p.inJail) {
    if (doubles) {
      p.inJail = false;
      p.jailTurns = 0;
      ev.push(info(`${p.name} rolled doubles and leaves jail`));
      moveAndResolve(s, p, d1 + d2, false, ev); // jail-exit doubles do NOT roll again
    } else if (++p.jailTurns >= 3) {
      // 3rd failed attempt: forced bail. MOVE FIRST, then charge — a debt frame pushed
      // before movement would lose the "then move by your throw" continuation.
      p.inJail = false;
      p.jailTurns = 0;
      ev.push(info(`${p.name} must pay bail after 3 failed attempts`));
      moveAndResolve(s, p, d1 + d2, false, ev);
      charge(s, pid, [{ creditor: "bank", amount: BAIL }], "bail", ev);
    } else {
      ev.push(info(`${p.name} stays in jail (${p.jailTurns}/3)`));
      s.phase = { t: "postRoll", again: false };
    }
    return ok(s, ev);
  }

  if (doubles && ++p.doublesCount === 3) {
    ev.push(info(`${p.name} rolled 3 doubles in a row`));
    sendToJail(s, p, ev);
    return ok(s, ev);
  }
  moveAndResolve(s, p, d1 + d2, doubles, ev);
  return ok(s, ev);
};

const payBail: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("not your turn");
  if (!p.inJail) return err("not in jail");
  if (p.cash < BAIL) return err("cannot afford bail");
  const ev: GameEvent[] = [];
  transfer(s, pid, "bank", BAIL, "bail", ev);
  p.inJail = false;
  p.jailTurns = 0;
  return ok(s, ev); // stays preRoll: now roll normally
};

const useJailCard: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("not your turn");
  if (!p.inJail) return err("not in jail");
  if (p.jailCards < 1) return err("no jail card");
  p.jailCards--;
  p.inJail = false;
  p.jailTurns = 0;
  return ok(s, [info(`${p.name} uses a Get Out of Jail Free card`)]);
};

// ---- buyPrompt -------------------------------------------------------

const buy: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "buyPrompt") return err("no purchase pending");
  const p = cur(s);
  if (p.id !== pid) return err("not your turn");
  const price = BOARD[ph.tile].price!;
  if (p.cash < price) return err("cannot afford");
  const ev: GameEvent[] = [];
  transfer(s, pid, "bank", price, `buy ${BOARD[ph.tile].name}`, ev);
  s.props[ph.tile] = { owner: pid, mortgaged: false, houses: 0 };
  s.phase = { t: "postRoll", again: ph.again };
  return ok(s, ev);
};

const decline: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "buyPrompt") return err("no purchase pending");
  if (cur(s).id !== pid) return err("not your turn");
  s.phase = { t: "postRoll", again: ph.again }; // resume point FIRST, then interrupt on top
  if (!s.settings.auction) return ok(s, [info(`${cur(s).name} declined ${BOARD[ph.tile].name}`)]);
  pushAuction(s, ph.tile, []);
  return ok(s, [info(`${cur(s).name} declined — auction for ${BOARD[ph.tile].name}`)]);
};

// Doubles UX: roll again straight from postRoll, no endTurn click in between.
const rollAgain: Handler = (s, pid, a) => {
  const ph = s.phase;
  if (ph.t !== "postRoll" || !ph.again) return err("already rolled");
  if (cur(s).id !== pid) return err("not your turn");
  s.phase = { t: "preRoll" };
  return roll(s, pid, a);
};

// ---- auction ---------------------------------------------------------

// amount is an increment over the current bid: concurrent quick-bids both land, in order
const bid: Handler = (s, pid, a) => {
  if (a.type !== "bid") return err("bad action");
  const f = s.stack.at(-1) as AuctionFrame;
  if (!f.active.includes(pid)) return err("not in this auction");
  if (f.leader === pid) return err("already leading");
  if (!Number.isInteger(a.amount) || a.amount <= 0) return err("bad bid");
  const total = f.bid + a.amount;
  if (total > cash(s, pid)) return err("cannot bid more than your cash"); // no debt born inside auctions, ever
  f.bid = total;
  f.leader = pid;
  f.bids.push({ pid, amount: total });
  return ok(s, [info(`${byId(s, pid).name} bids $${total}`)]);
};

const fold: Handler = (s, pid) => {
  const f = s.stack.at(-1) as AuctionFrame;
  if (!f.active.includes(pid)) return err("not in this auction");
  if (f.leader === pid) return err("highest bidder cannot fold");
  f.active = f.active.filter((x) => x !== pid);
  const ev: GameEvent[] = [];
  const done = f.active.length === 0 || (f.leader !== null && f.active.every((x) => x === f.leader));
  if (done) settleAuction(s, f, ev);
  return ok(s, ev);
};

// server-only (not a ClientAction, or clients could snipe): deadline expired -> settle
export function auctionTimeout(state: GameState): Result {
  if (state.stack.at(-1)?.t !== "auction") return err("no auction");
  const s = clone(state);
  const ev: GameEvent[] = [];
  settleAuction(s, s.stack.at(-1) as AuctionFrame, ev);
  return ok(s, ev);
}

// ---- debt ------------------------------------------------------------

const payDebt: Handler = (s, pid) => {
  const f = s.stack.at(-1) as DebtFrame;
  if (f.debtor !== pid) return err("not your debt");
  const ev: GameEvent[] = [];
  while (f.claims.length > 0 && cash(s, pid) >= f.claims[0].amount) {
    const c = f.claims.shift()!;
    transfer(s, pid, c.creditor, c.amount, "debt", ev);
  }
  if (f.claims.length > 0) return ev.length ? ok(s, ev) : err("not enough cash — sell, mortgage, trade or go bankrupt");
  s.stack.pop(); // resume: whatever is underneath speaks
  return ok(s, ev);
};

const bankrupt: Handler = (s, pid) => {
  const f = s.stack.at(-1) as DebtFrame;
  if (f.debtor !== pid) return err("not your debt");
  const ev: GameEvent[] = [];
  s.stack.pop();
  if (f.claims.every((c) => c.creditor === "bank")) seizeToBank(s, pid, ev);
  else expropriate(s, pid, f.claims, ev); // estate to the bank, creditors paid from the proceeds
  return ok(s, ev);
};

// ---- votekick (orthogonal, like trades) ------------------------------

// unanimous consent of the other alive players kicks an AFK player;
// their estate falls to the bank and gets re-auctioned
function votekick(s: GameState, pid: PlayerId, target: PlayerId): Result {
  const voter = s.players.find((p) => p.id === pid);
  const victim = s.players.find((p) => p.id === target);
  if (!voter || voter.bankrupt) return err("not in this game");
  if (!victim || victim.bankrupt) return err("no such player");
  if (pid === target) return err("cannot kick yourself");
  if (s.stack.some((f) => f.t === "auction")) return err("wait for the auction to end"); // kicking a bid leader would corrupt the auction
  const others = alive(s).filter((p) => p.id !== target);
  if (others.length < 2 && victim.connected) return err("cannot kick a present player 1v1"); // kick = instant win otherwise

  const votes = new Set(s.kickVotes[target] ?? []);
  votes.add(pid);
  s.kickVotes[target] = [...votes];
  const ev: GameEvent[] = [info(`${voter.name} votes to kick ${victim.name} (${votes.size}/${others.length})`)];
  if (votes.size < others.length) return ok(s, ev);

  // unanimous: void any debt frame the target holds (a dead debtor would block the machine)
  s.stack = s.stack.filter((f) => !(f.t === "debt" && f.debtor === target));
  ev.push(info(`${victim.name} was kicked`));
  seizeToBank(s, target, ev);
  return ok(s, ev);
}

// ---- asset actions ----------------------------------------------------

// build/unmortgage SPEND cash -> gated to your own preRoll/postRoll (a bid leader
// spending below their bid would go negative at settle). The cash raisers
// mortgage/sellHouse/sellProperty are routed orthogonally in apply().
function asset(fn: (s: GameState, pid: PlayerId, tile: number) => string | null): Handler {
  return (s, pid, a) => {
    if (!("tile" in a)) return err("bad action");
    if (cur(s).id !== pid) return err("not your move");
    const e = fn(s, pid, a.tile);
    return e ? err(e) : ok(s);
  };
}

const endTurn: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "postRoll") return err("cannot end turn now");
  const p = cur(s);
  if (p.id !== pid) return err("not your turn");
  if (ph.again && !p.inJail) {
    s.phase = { t: "preRoll" };
    return ok(s, [info(`${p.name} rolled doubles — roll again`)]);
  }
  p.doublesCount = 0;
  return ok(advanceTurn(s));
};

// ---- the handler table: this IS the ruleset topology ----------------

const HANDLERS: Record<Node["t"], Partial<Record<ClientAction["type"], Handler>>> = {
  preRoll: { roll, payBail, useJailCard, build: asset(props.build), unmortgage: asset(props.unmortgage) },
  buyPrompt: { buy, decline },
  postRoll: {
    endTurn,
    roll: rollAgain,
    build: asset(props.build),
    unmortgage: asset(props.unmortgage),
  },
  auction: { bid, fold },
  debt: { payDebt, bankrupt },
};

// ---- lobby -----------------------------------------------------------

function shuffled(s: GameState, n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = nextInt(s, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function lobby(s: GameState, pid: PlayerId, a: ClientAction): Result {
  const isHost = s.players[0]?.id === pid;

  if (a.type === "updateSettings") {
    if (!isHost) return err("only the host can change settings");
    const base = s.settings;
    const n = { ...base, ...a.settings };
    n.maxPlayers = Math.max(2, Math.min(8, Math.floor(n.maxPlayers) || base.maxPlayers));
    if (n.maxPlayers < s.players.length) n.maxPlayers = s.players.length;
    n.startingCash = Math.max(1, Math.min(1_000_000, Math.floor(n.startingCash) || base.startingCash));
    s.settings = n;
    return ok(s);
  }

  if (a.type !== "start") return err("game not started");
  if (!isHost) return err("only the host can start");
  if (s.players.length < 2) return err("need 2+ players");
  s.status = "playing";
  if (s.settings.randomOrder) {
    const order = shuffled(s, s.players.length);
    s.players = order.map((i) => s.players[i]);
  }
  for (const p of s.players) p.cash = s.settings.startingCash;
  s.current = 0;
  s.phase = { t: "preRoll" };
  s.decks = { chance: shuffled(s, CHANCE.length), chest: shuffled(s, CHEST.length) };
  return ok(s, [info("game started")]);
}

// ---- the ONLY entry point -------------------------------------------

export function apply(state: GameState, pid: PlayerId, a: ClientAction): Result {
  if (state.status === "ended") return err("game over");
  if (state.status === "lobby") return lobby(clone(state), pid, a);
  if (a.type === "proposeTrade" || a.type === "respondTrade" || a.type === "cancelTrade")
    return handleTrade(clone(state), pid, a); // orthogonal region
  if (a.type === "votekick") return votekick(clone(state), pid, a.target); // orthogonal region
  if (a.type === "mortgage" || a.type === "sellHouse" || a.type === "sellProperty") {
    // cash raisers: own turn or own debt only — no off-turn asset stripping
    const s = clone(state);
    if (cur(s).id !== pid && !s.stack.some((f) => f.t === "debt" && f.debtor === pid)) return err("not your turn");
    const fn = { mortgage: props.mortgage, sellHouse: props.sellHouse, sellProperty: props.sellProperty }[a.type];
    const e = fn(s, pid, a.tile);
    return e ? err(e) : ok(s);
  }
  if (a.type === "bankrupt" && !(activeNode(state).t === "debt" && (activeNode(state) as DebtFrame).debtor === pid)) {
    // voluntary exit, anytime: estate to the bank, re-auctioned. In-debt bankruptcy
    // stays on the debt handler below (creditors get paid from the proceeds).
    const s = clone(state);
    const p = s.players.find((x) => x.id === pid);
    if (!p || p.bankrupt) return err("not in this game");
    if (s.stack.some((f) => f.t === "auction")) return err("wait for the auction to end"); // a dead bid leader would corrupt the auction
    if (s.stack.some((f) => f.t === "debt" && f.debtor === pid)) return err("resolve your debt first");
    const ev: GameEvent[] = [info(`${p.name} declares bankruptcy`)];
    seizeToBank(s, pid, ev);
    return ok(s, ev);
  }

  const node = activeNode(state);
  const h = HANDLERS[node.t][a.type];
  if (!h) return err(`${a.type} is not legal while ${node.t}`); // <- structural rejection
  return h(clone(state), pid, a);
}

// Derived from the SAME table (+ the cash raisers on your turn / your debt). Feeds
// client button enablement AND the soak test.
export function legalActions(s: Pick<GameState, "status" | "phase" | "stack" | "players" | "current">, pid: PlayerId): ClientAction["type"][] {
  if (s.status === "lobby") return ["start", "updateSettings"];
  if (s.status === "ended") return [];
  const base = Object.keys(HANDLERS[activeNode(s).t]) as ClientAction["type"][];
  const raiser = s.players[s.current]?.id === pid || s.stack.some((f) => f.t === "debt" && f.debtor === pid);
  return raiser ? [...base, "mortgage", "sellHouse", "sellProperty"] : base;
}
