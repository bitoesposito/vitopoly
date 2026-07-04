import type { AuctionFrame, ClientAction, DebtFrame, GameEvent, GameState, Interrupt, PlayerId, Result, TurnPhase } from "./types";
import { BAIL, BOARD } from "./board-data";
import { roll2d6, nextInt } from "./rng";
import { alive, byId, cash, charge, cur, eliminate, moveAndResolve, pushAuction, sendToJail, settleAuction, transfer } from "./flow";
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
  do {
    s.current = (s.current + 1) % s.players.length;
  } while (s.players[s.current].bankrupt);
  s.players[s.current].doublesCount = 0;
  s.phase = { t: "preRoll" };
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

const bid: Handler = (s, pid, a) => {
  if (a.type !== "bid") return err("bad action");
  const f = s.stack.at(-1) as AuctionFrame;
  if (!f.active.includes(pid)) return err("not in this auction");
  if (!Number.isInteger(a.amount) || a.amount <= f.bid) return err("bid too low");
  if (a.amount > cash(s, pid)) return err("cannot bid more than your cash"); // no debt born inside auctions, ever
  f.bid = a.amount;
  f.leader = pid;
  return ok(s, [info(`${byId(s, pid).name} bids $${a.amount}`)]);
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
  const creditor = f.claims[0].creditor; // ponytail: mixed-creditor debt -> everything to the first. deviation
  const estate = Object.keys(s.props).map(Number).filter((t) => s.props[t]!.owner === pid);

  // buildings always liquidate to the bank at half price first
  for (const t of estate) {
    const own = s.props[t]!;
    if (own.houses > 0) {
      const refund = (own.houses === 5 ? 5 : own.houses) * (BOARD[t].houseCost! / 2);
      if (own.houses === 5) s.bank.hotels++;
      else s.bank.houses += own.houses;
      own.houses = 0;
      transfer(s, "bank", pid, refund, "liquidation", ev);
    }
  }

  if (creditor === "bank") {
    for (const t of estate) delete s.props[t];
    if (byId(s, pid).cash > 0) transfer(s, pid, "bank", byId(s, pid).cash, "bankruptcy", ev);
    eliminate(s, pid, ev);
    if (s.status !== "ended" && estate.length > 0) pushAuction(s, estate[0], estate.slice(1)); // estate auction chain
  } else {
    for (const t of estate) s.props[t]!.owner = creditor;
    const remaining = byId(s, pid).cash;
    if (remaining > 0) transfer(s, pid, creditor, remaining, "bankruptcy", ev);
    byId(s, creditor).jailCards += byId(s, pid).jailCards;
    byId(s, pid).jailCards = 0;
    eliminate(s, pid, ev);
  }
  return ok(s, ev);
};

// ---- postRoll asset actions -----------------------------------------

// properties.ts fns share one wrapper; mounted under postRoll AND debt (same fn, two legal contexts)
function asset(fn: (s: GameState, pid: PlayerId, tile: number) => string | null): Handler {
  return (s, pid, a) => {
    if (!("tile" in a)) return err("bad action");
    const node = activeNode(s);
    const allowed = node.t === "debt" ? (node as DebtFrame).debtor === pid : cur(s).id === pid;
    if (!allowed) return err("not your move");
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
  preRoll: { roll, payBail, useJailCard },
  buyPrompt: { buy, decline },
  postRoll: {
    endTurn,
    roll: rollAgain,
    build: asset(props.build),
    sellHouse: asset(props.sellHouse),
    mortgage: asset(props.mortgage),
    unmortgage: asset(props.unmortgage),
  },
  auction: { bid, fold },
  debt: {
    payDebt,
    bankrupt,
    sellHouse: asset(props.sellHouse),
    mortgage: asset(props.mortgage),
  },
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

  const node = activeNode(state);
  const h = HANDLERS[node.t][a.type];
  if (!h) return err(`${a.type} is not legal while ${node.t}`); // <- structural rejection
  return h(clone(state), pid, a);
}

// Derived from the SAME table. Feeds client button enablement AND the soak test.
export function legalActions(s: Pick<GameState, "status" | "phase" | "stack">, _pid: PlayerId): ClientAction["type"][] {
  if (s.status === "lobby") return ["start", "updateSettings"];
  if (s.status === "ended") return [];
  return Object.keys(HANDLERS[activeNode(s).t]) as ClientAction["type"][];
}
