import type { AuctionFrame, ClientAction, DebtFrame, GameEvent, GameState, Interrupt, PlayerId, Result, TurnPhase } from "./types";
import { BAIL, BOARD } from "./board-data";
import { roll2d6, nextInt } from "./rng";
import { alive, byId, cash, charge, cur, expropriate, moveAndResolve, nextPlayer, pushAuction, seizeToBank, sendToJail, settleAuction, transfer } from "./flow";
import * as props from "./properties";
import { handleTrade, voidTradesTouching } from "./trades";
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
  if (p.id !== pid) return err("non è il tuo turno");
  const [d1, d2] = roll2d6(s);
  const ev: GameEvent[] = [{ e: "rolled", pid, d1, d2 }];
  const doubles = d1 === d2;

  if (p.inJail) {
    if (doubles) {
      p.inJail = false;
      p.jailTurns = 0;
      ev.push(info(`${p.name} fa doppio ed esce di prigione`));
      moveAndResolve(s, p, d1 + d2, false, ev); // jail-exit doubles do NOT roll again
    } else if (++p.jailTurns >= 3) {
      // 3rd failed attempt: forced bail. MOVE FIRST, then charge — a debt frame pushed
      // before movement would lose the "then move by your throw" continuation.
      p.inJail = false;
      p.jailTurns = 0;
      ev.push(info(`${p.name} paga la cauzione dopo 3 tentativi falliti`));
      moveAndResolve(s, p, d1 + d2, false, ev);
      charge(s, pid, [{ creditor: "bank", amount: BAIL }], "bail", ev);
    } else {
      ev.push(info(`${p.name} resta in prigione (${p.jailTurns}/3)`));
      s.phase = { t: "postRoll", again: false };
    }
    return ok(s, ev);
  }

  if (doubles && ++p.doublesCount === 3) {
    sendToJail(s, p, ev); // 3 doppi di fila: il jailed event racconta tutto
    return ok(s, ev);
  }
  moveAndResolve(s, p, d1 + d2, doubles, ev);
  return ok(s, ev);
};

const payBail: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  if (!p.inJail) return err("non sei in prigione");
  if (p.cash < BAIL) return err("non puoi permetterti la cauzione");
  const ev: GameEvent[] = [];
  transfer(s, pid, "bank", BAIL, "bail", ev);
  p.inJail = false;
  p.jailTurns = 0;
  return ok(s, ev); // stays preRoll: now roll normally
};

const useJailCard: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  if (!p.inJail) return err("non sei in prigione");
  if (p.jailCards < 1) return err("nessuna carta prigione");
  p.jailCards--;
  p.inJail = false;
  p.jailTurns = 0;
  return ok(s, [info(`${p.name} usa una carta Esci gratis di prigione`)]);
};

// ---- buyPrompt -------------------------------------------------------

const buy: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "buyPrompt") return err("nessun acquisto in corso");
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  const price = BOARD[ph.tile].price!;
  if (p.cash < price) return err("non te lo puoi permettere");
  const ev: GameEvent[] = [];
  transfer(s, pid, "bank", price, `buy ${BOARD[ph.tile].name}`, ev);
  s.props[ph.tile] = { owner: pid, mortgaged: false, houses: 0 };
  s.phase = { t: "postRoll", again: ph.again };
  return ok(s, ev);
};

const decline: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "buyPrompt") return err("nessun acquisto in corso");
  if (cur(s).id !== pid) return err("non è il tuo turno");
  s.phase = { t: "postRoll", again: ph.again }; // resume point FIRST, then interrupt on top
  if (s.settings.auction) pushAuction(s, ph.tile, []); // il pannello asta che compare È la notifica
  return ok(s);
};

// Doubles UX: roll again straight from postRoll, no endTurn click in between.
const rollAgain: Handler = (s, pid, a) => {
  const ph = s.phase;
  if (ph.t !== "postRoll" || !ph.again) return err("hai già tirato");
  if (cur(s).id !== pid) return err("non è il tuo turno");
  s.phase = { t: "preRoll" };
  return roll(s, pid, a);
};

// ---- auction ---------------------------------------------------------

// amount is an increment over the current bid: concurrent quick-bids both land, in order
const bid: Handler = (s, pid, a) => {
  if (a.type !== "bid") return err("azione non valida");
  const f = s.stack.at(-1) as AuctionFrame;
  if (!f.active.includes(pid)) return err("non sei in questa asta");
  if (f.leader === pid) return err("sei già in testa");
  if (!Number.isInteger(a.amount) || a.amount <= 0) return err("offerta non valida");
  const total = f.bid + a.amount;
  if (total > cash(s, pid)) return err("non puoi offrire più dei tuoi contanti"); // no debt born inside auctions, ever
  f.bid = total;
  f.leader = pid;
  f.bids.push({ pid, amount: total }); // lo storico del pannello asta basta: niente riga di log
  return ok(s); // (importi in € solo a display: qui girano numeri)
};

const fold: Handler = (s, pid) => {
  const f = s.stack.at(-1) as AuctionFrame;
  if (!f.active.includes(pid)) return err("non sei in questa asta");
  if (f.leader === pid) return err("il miglior offerente non può ritirarsi");
  f.active = f.active.filter((x) => x !== pid);
  const ev: GameEvent[] = [];
  const done = f.active.length === 0 || (f.leader !== null && f.active.every((x) => x === f.leader));
  if (done) settleAuction(s, f, ev);
  return ok(s, ev);
};

// server-only (not a ClientAction, or clients could snipe): deadline expired -> settle
export function auctionTimeout(state: GameState): Result {
  if (state.stack.at(-1)?.t !== "auction") return err("nessuna asta");
  const s = clone(state);
  const ev: GameEvent[] = [];
  settleAuction(s, s.stack.at(-1) as AuctionFrame, ev);
  return ok(s, ev);
}

// ---- debt ------------------------------------------------------------

const payDebt: Handler = (s, pid) => {
  const f = s.stack.at(-1) as DebtFrame;
  if (f.debtor !== pid) return err("non è il tuo debito");
  const ev: GameEvent[] = [];
  while (f.claims.length > 0 && cash(s, pid) >= f.claims[0].amount) {
    const c = f.claims.shift()!;
    transfer(s, pid, c.creditor, c.amount, "debt", ev);
  }
  if (f.claims.length > 0) return ev.length ? ok(s, ev) : err("contanti insufficienti — vendi, ipoteca, scambia o dichiara bancarotta");
  s.stack.pop(); // resume: whatever is underneath speaks
  return ok(s, ev);
};

const bankrupt: Handler = (s, pid) => {
  const f = s.stack.at(-1) as DebtFrame;
  if (f.debtor !== pid) return err("non è il tuo debito");
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
  if (!voter || voter.bankrupt) return err("non sei in partita");
  if (!victim || victim.bankrupt) return err("giocatore inesistente");
  if (pid === target) return err("non puoi espellere te stesso");
  if (s.stack.some((f) => f.t === "auction")) return err("aspetta la fine dell'asta"); // kicking a bid leader would corrupt the auction
  const others = alive(s).filter((p) => p.id !== target);
  if (others.length < 2 && victim.connected) return err("non puoi espellere un giocatore presente in 1v1"); // kick = instant win otherwise

  const votes = new Set(s.kickVotes[target] ?? []);
  votes.add(pid);
  s.kickVotes[target] = [...votes];
  const ev: GameEvent[] = [info(`${voter.name} vota per espellere ${victim.name} (${votes.size}/${others.length})`)];
  if (votes.size < others.length) return ok(s, ev);

  // unanimous: void any debt frame the target holds (a dead debtor would block the machine)
  s.stack = s.stack.filter((f) => !(f.t === "debt" && f.debtor === target));
  ev.push(info(`${victim.name} è stato espulso`));
  seizeToBank(s, target, ev);
  return ok(s, ev);
}

// ---- asset actions ----------------------------------------------------

// Esegue un'operazione su una proprietà ed emette l'evento `asset` per il log
// (importo = variazione di cassa; hotel = coinvolto un hotel), poi invalida gli
// scambi pendenti che toccano quella casella.
function assetOp(
  s: GameState,
  pid: PlayerId,
  tile: number,
  what: "build" | "sellHouse" | "mortgage" | "unmortgage" | "sellProperty",
  fn: (s: GameState, pid: PlayerId, tile: number) => string | null,
): Result {
  const cashBefore = byId(s, pid).cash;
  const housesBefore = s.props[tile]?.houses ?? 0;
  const e = fn(s, pid, tile);
  if (e) return err(e);
  const hotel = housesBefore === 5 || (s.props[tile]?.houses ?? 0) === 5;
  const ev: GameEvent[] = [{ e: "asset", pid, tile, what, amount: Math.abs(byId(s, pid).cash - cashBefore), hotel }];
  ev.push(...voidTradesTouching(s, tile));
  return ok(s, ev);
}

// build/unmortgage SPEND cash -> gated to your own preRoll/postRoll (a bid leader
// spending below their bid would go negative at settle). The cash raisers
// mortgage/sellHouse/sellProperty are routed orthogonally in apply().
function asset(fn: (s: GameState, pid: PlayerId, tile: number) => string | null): Handler {
  return (s, pid, a) => {
    if (!("tile" in a)) return err("azione non valida");
    if (cur(s).id !== pid) return err("non è il tuo turno");
    return assetOp(s, pid, a.tile, a.type, fn);
  };
}

const endTurn: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "postRoll") return err("non puoi finire il turno ora");
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  if (ph.again && !p.inJail) {
    s.phase = { t: "preRoll" };
    return ok(s);
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
    if (!isHost) return err("solo l'host può cambiare le impostazioni");
    const base = s.settings;
    const n = { ...base, ...a.settings };
    n.maxPlayers = Math.max(2, Math.min(8, Math.floor(n.maxPlayers) || base.maxPlayers));
    if (n.maxPlayers < s.players.length) n.maxPlayers = s.players.length;
    n.startingCash = Math.max(1, Math.min(1_000_000, Math.floor(n.startingCash) || base.startingCash));
    s.settings = n;
    return ok(s);
  }

  if (a.type !== "start") return err("partita non iniziata");
  if (!isHost) return err("solo l'host può iniziare");
  if (s.players.length < 2) return err("servono almeno 2 giocatori");
  s.status = "playing";
  if (s.settings.randomOrder) {
    const order = shuffled(s, s.players.length);
    s.players = order.map((i) => s.players[i]);
  }
  for (const p of s.players) p.cash = s.settings.startingCash;
  s.current = 0;
  s.phase = { t: "preRoll" };
  s.decks = { chance: shuffled(s, CHANCE.length), chest: shuffled(s, CHEST.length) };
  return ok(s, [info("partita iniziata")]);
}

// ---- the ONLY entry point -------------------------------------------

export function apply(state: GameState, pid: PlayerId, a: ClientAction): Result {
  if (state.status === "ended") return err("partita finita");
  if (state.status === "lobby") return lobby(clone(state), pid, a);
  if (a.type === "proposeTrade" || a.type === "respondTrade" || a.type === "cancelTrade")
    return handleTrade(clone(state), pid, a); // orthogonal region
  if (a.type === "votekick") return votekick(clone(state), pid, a.target); // orthogonal region
  if (a.type === "mortgage" || a.type === "sellHouse" || a.type === "sellProperty") {
    // cash raisers: own turn or own debt only — no off-turn asset stripping
    const s = clone(state);
    if (cur(s).id !== pid && !s.stack.some((f) => f.t === "debt" && f.debtor === pid)) return err("non è il tuo turno");
    const fn = { mortgage: props.mortgage, sellHouse: props.sellHouse, sellProperty: props.sellProperty }[a.type];
    return assetOp(s, pid, a.tile, a.type, fn);
  }
  const top = activeNode(state);
  if (a.type === "bankrupt" && !(top.t === "debt" && top.debtor === pid)) {
    // voluntary exit, anytime: estate to the bank, re-auctioned. In-debt bankruptcy
    // stays on the debt handler below (creditors get paid from the proceeds).
    const s = clone(state);
    const p = s.players.find((x) => x.id === pid);
    if (!p || p.bankrupt) return err("non sei in partita");
    if (s.stack.some((f) => f.t === "auction")) return err("aspetta la fine dell'asta"); // a dead bid leader would corrupt the auction
    if (s.stack.some((f) => f.t === "debt" && f.debtor === pid)) return err("prima risolvi il tuo debito");
    const ev: GameEvent[] = [info(`${p.name} dichiara bancarotta`)];
    seizeToBank(s, pid, ev);
    return ok(s, ev);
  }

  const h = HANDLERS[top.t][a.type];
  if (!h) return err(`${a.type} non è consentito durante ${top.t}`); // <- structural rejection
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
