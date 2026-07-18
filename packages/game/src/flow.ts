import type { AuctionFrame, GameEvent, GameState, Player, PlayerId, TileId } from "./types";
import { BOARD, JAIL } from "./board-data";
import { advance, landing } from "./board";
import { CHANCE, CHEST } from "./cards";
import { nextInt } from "./rng";

// Shared game machinery. The ONLY code (with engine.ts) that writes phase/stack.

export const cur = (s: GameState): Player => s.players[s.current];
export const byId = (s: GameState, pid: PlayerId): Player => s.players.find((p) => p.id === pid)!;
export const alive = (s: GameState): Player[] => s.players.filter((p) => !p.bankrupt);
export const cash = (s: GameState, pid: PlayerId): number => byId(s, pid).cash;

// Hand the turn to the next non-bankrupt player and reset to a fresh preRoll.
// Assumes at least 2 players remain (caller checks the win condition first).
export function nextPlayer(s: GameState): void {
  do {
    s.current = (s.current + 1) % s.players.length;
  } while (s.players[s.current].bankrupt);
  s.players[s.current].doublesCount = 0;
  s.phase = { t: "preRoll" };
}

export interface Claim {
  creditor: PlayerId | "bank";
  amount: number;
}

// Purchases don't feed the vacation pot; taxes, cards, repairs, bail, bank debts do.
const NO_POT = new Set(["auction", "bankruptcy", "trade"]);

export function transfer(s: GameState, from: PlayerId | "bank", to: PlayerId | "bank", amount: number, why: string, ev: GameEvent[]): void {
  if (from !== "bank") byId(s, from).cash -= amount;
  if (to !== "bank") byId(s, to).cash += amount;
  if (to === "bank" && s.settings.vacationCash && !NO_POT.has(why) && !why.startsWith("buy ")) s.vacationPot += amount;
  ev.push({ e: "paid", from, to, amount, why });
}

// EVERY payment a player owes funnels through here. Insufficient cash != error: it's a state.
export function charge(s: GameState, debtor: PlayerId, claims: Claim[], why: string, ev: GameEvent[]): void {
  const rest: Claim[] = [];
  for (const c of claims) {
    if (rest.length === 0 && cash(s, debtor) >= c.amount) transfer(s, debtor, c.creditor, c.amount, why, ev);
    else rest.push(c);
  }
  if (rest.length > 0) {
    s.stack.push({ t: "debt", debtor, claims: rest });
    ev.push({ e: "info", text: `${byId(s, debtor).name} owes $${rest.reduce((a, c) => a + c.amount, 0)} (${why})` });
  }
}

export function sendToJail(s: GameState, p: Player, ev: GameEvent[]): void {
  p.pos = JAIL;
  p.inJail = true;
  p.jailTurns = 0;
  p.doublesCount = 0;
  s.phase = { t: "postRoll", again: false }; // going to jail ends the movement; turn ends via endTurn
  ev.push({ e: "jailed", pid: p.id });
}

// Movement + landing resolution. Sets the RESUME point (postRoll) first, then may
// park the machine on buyPrompt or push a debt frame on top.
export function moveAndResolve(s: GameState, p: Player, steps: number, again: boolean, ev: GameEvent[]): void {
  s.phase = { t: "postRoll", again };
  const { from, to, passedGo } = advance(s, p, steps);
  ev.push({ e: "moved", pid: p.id, from, to });
  if (passedGo) ev.push({ e: "paid", from: "bank", to: p.id, amount: 200, why: "GO salary" });
  resolveLanding(s, p, steps, again, ev);
}

function resolveLanding(s: GameState, p: Player, diceTotal: number, again: boolean, ev: GameEvent[]): void {
  const out = landing(s, p, diceTotal);
  switch (out.t) {
    case "none":
      return;
    case "offerBuy":
      s.phase = { t: "buyPrompt", tile: out.tile, again };
      return;
    case "charge":
      charge(s, p.id, [{ creditor: out.to as PlayerId | "bank", amount: out.amount }], out.why, ev);
      return;
    case "card":
      drawCard(s, p, out.deck, again, ev);
      return;
    case "goToJail":
      sendToJail(s, p, ev);
      return;
    case "vacation":
      if (s.settings.vacationCash && s.vacationPot > 0) {
        transfer(s, "bank", p.id, s.vacationPot, "vacation cash", ev);
        s.vacationPot = 0;
      }
      return;
  }
}

// ---- cards -----------------------------------------------------------

function drawCard(s: GameState, p: Player, deck: "chance" | "chest", again: boolean, ev: GameEvent[]): void {
  const pile = s.decks[deck];
  const id = pile.shift()!;
  pile.push(id); // reinsert at the bottom. jail cards duplicate this way — accepted
  const card = (deck === "chance" ? CHANCE : CHEST)[id];
  ev.push({ e: "card", pid: p.id, deck, cardId: id }); // the UI renders this — no duplicate info line

  const fx = card.fx;
  switch (fx.k) {
    case "goto":
      moveAndResolve(s, p, (fx.tile - p.pos + 40) % 40, again, ev);
      return;
    case "gotoNearest": {
      const spots = BOARD.flatMap((t, i) => (t.kind === fx.kind ? [i] : []));
      const target = spots.find((i) => i > p.pos) ?? spots[0];
      moveAndResolve(s, p, (target - p.pos + 40) % 40, again, ev);
      return;
    }
    case "back": {
      p.pos = (p.pos - fx.n + 40) % 40;
      ev.push({ e: "moved", pid: p.id, from: (p.pos + fx.n) % 40, to: p.pos });
      resolveLanding(s, p, fx.n, again, ev); // dice total for a rare utility edge = n. fine
      return;
    }
    case "collect":
      transfer(s, "bank", p.id, fx.amount, "card", ev);
      return;
    case "pay":
      charge(s, p.id, [{ creditor: "bank", amount: fx.amount }], "card", ev);
      return;
    case "payEach":
      charge(s, p.id, alive(s).filter((x) => x.id !== p.id).map((x) => ({ creditor: x.id, amount: fx.amount })), "card", ev);
      return;
    case "collectEach":
      // each OTHER player owes p — insolvent ones get their own debt frame (they resolve top-down)
      for (const x of alive(s).filter((x) => x.id !== p.id)) charge(s, x.id, [{ creditor: p.id, amount: fx.amount }], "card", ev);
      return;
    case "jailCard":
      p.jailCards++;
      return;
    case "gotoJail":
      sendToJail(s, p, ev);
      return;
    case "repairs": {
      const total = Object.values(s.props).reduce((sum, own) => {
        if (!own || own.owner !== p.id) return sum;
        return sum + (own.houses === 5 ? fx.hotel : own.houses * fx.house);
      }, 0);
      if (total > 0) charge(s, p.id, [{ creditor: "bank", amount: total }], "repairs", ev);
      return;
    }
  }
}

// ---- auctions --------------------------------------------------------

export function pushAuction(s: GameState, tile: TileId, queue: TileId[]): void {
  s.stack.push({ t: "auction", tile, queue, bid: 0, leader: null, active: alive(s).map((p) => p.id), bids: [] });
}

export function settleAuction(s: GameState, frame: AuctionFrame, ev: GameEvent[]): void {
  if (frame.leader) {
    transfer(s, frame.leader, "bank", frame.bid, "auction", ev);
    s.props[frame.tile] = { owner: frame.leader, mortgaged: false, houses: 0 };
    ev.push({ e: "auctionWon", pid: frame.leader, tile: frame.tile, price: frame.bid });
  } else {
    ev.push({ e: "info", text: `nobody bid on ${BOARD[frame.tile].name}` });
  }
  s.stack.pop();
  if (frame.queue.length > 0) pushAuction(s, frame.queue[0], frame.queue.slice(1)); // estate chain
}

// ---- elimination -----------------------------------------------------

// Buildings always liquidate to the bank at half price. Returns the estate's tiles.
export function liquidateBuildings(s: GameState, pid: PlayerId, ev: GameEvent[]): TileId[] {
  const estate = Object.keys(s.props).map(Number).filter((t) => s.props[t]!.owner === pid);
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
  return estate;
}

// Bankruptcy toward players: the bank expropriates the estate (buildings and deeds
// at half price), creditors get paid from the proceeds — partially if short — and
// the deeds return to play via auction. Nobody inherits a whole estate.
export function expropriate(s: GameState, pid: PlayerId, claims: Claim[], ev: GameEvent[]): void {
  const estate = liquidateBuildings(s, pid, ev);
  for (const t of estate) {
    if (!s.props[t]!.mortgaged) transfer(s, "bank", pid, BOARD[t].price! / 2, "expropriation", ev);
    delete s.props[t];
  }
  for (const c of claims) {
    const pay = Math.min(byId(s, pid).cash, c.amount);
    if (pay > 0) transfer(s, pid, c.creditor, pay, "bankruptcy", ev);
  }
  if (byId(s, pid).cash > 0) transfer(s, pid, "bank", byId(s, pid).cash, "bankruptcy", ev);
  eliminate(s, pid, ev);
  if (s.status !== "ended" && estate.length > 0) pushAuction(s, estate[0], estate.slice(1));
}

// The whole estate falls to the bank and the deeds get re-auctioned.
// Shared by bank-bankruptcy, voluntary bankruptcy and vote-kick.
export function seizeToBank(s: GameState, pid: PlayerId, ev: GameEvent[]): void {
  const estate = liquidateBuildings(s, pid, ev);
  for (const t of estate) delete s.props[t];
  if (byId(s, pid).cash > 0) transfer(s, pid, "bank", byId(s, pid).cash, "bankruptcy", ev);
  eliminate(s, pid, ev);
  if (s.status !== "ended" && estate.length > 0) pushAuction(s, estate[0], estate.slice(1)); // estate auction chain
}

// The single choke point: mark bankrupt, scrub from every frame/trade, hand the turn on.
export function eliminate(s: GameState, pid: PlayerId, ev: GameEvent[]): void {
  const p = byId(s, pid);
  p.bankrupt = true;
  ev.push({ e: "bankrupt", pid });

  s.trades = s.trades.filter((t) => t.from !== pid && t.to !== pid);
  for (const f of s.stack) {
    if (f.t === "auction") f.active = f.active.filter((x) => x !== pid);
    // a dead leader cannot happen: leaders can't fold, bids are cash-capped, trades banned during auctions
  }
  // kick votes by or against the dead player are void
  delete s.kickVotes[pid];
  for (const k of Object.keys(s.kickVotes)) {
    const rest = s.kickVotes[k]!.filter((v) => v !== pid);
    if (rest.length > 0) s.kickVotes[k] = rest;
    else delete s.kickVotes[k];
  }

  const survivors = alive(s);
  if (survivors.length <= 1) {
    s.status = "ended";
    s.winner = survivors[0]?.id;
    return;
  }
  // replace the dead player's frozen phase UNDER any interrupt frames — they keep blocking
  if (cur(s).id === pid) nextPlayer(s);
}

// Deterministic-ish id for trades (advances the seed — uniqueness among live trades is enough).
export function newTradeId(s: GameState): string {
  return `t${nextInt(s, 1_000_000_000)}`;
}
