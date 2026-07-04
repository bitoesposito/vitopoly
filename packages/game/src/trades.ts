import type { Bundle, GameEvent, GameState, PlayerId, Result, Trade } from "./types";
import { BOARD, groupTiles } from "./board-data";
import { byId, newTradeId, transfer } from "./flow";

// Orthogonal region: trades live alongside the turn. Banned only during auctions
// (a trade draining the high bidder would make settlement insolvent).

function validateBundle(s: GameState, pid: PlayerId, b: Bundle): string | null {
  const p = byId(s, pid);
  if (b.cash < 0 || !Number.isInteger(b.cash)) return "bad cash";
  if (b.cash > p.cash) return "not enough cash";
  if (b.jailCards > p.jailCards) return "not enough jail cards";
  for (const t of b.props) {
    const own = s.props[t];
    if (!own || own.owner !== pid) return `you don't own ${BOARD[t].name}`;
    const group = BOARD[t].group;
    if (group && groupTiles(group).some((g) => (s.props[g]?.houses ?? 0) > 0)) return "group has buildings — sell them first";
  }
  return null;
}

function execute(s: GameState, tr: Trade, ev: GameEvent[]): void {
  if (tr.give.cash > 0) transfer(s, tr.from, tr.to, tr.give.cash, "trade", ev);
  if (tr.get.cash > 0) transfer(s, tr.to, tr.from, tr.get.cash, "trade", ev);
  for (const t of tr.give.props) s.props[t]!.owner = tr.to;
  for (const t of tr.get.props) s.props[t]!.owner = tr.from;
  byId(s, tr.from).jailCards += tr.get.jailCards - tr.give.jailCards;
  byId(s, tr.to).jailCards += tr.give.jailCards - tr.get.jailCards;
  ev.push({ e: "info", text: `${byId(s, tr.from).name} and ${byId(s, tr.to).name} completed a trade` });
}

export function handleTrade(s: GameState, pid: PlayerId, a: Extract<import("./types").ClientAction, { type: `${string}Trade` }>): Result {
  const ev: GameEvent[] = [];
  if (s.stack.some((f) => f.t === "auction")) return { ok: false, error: "no trading during an auction" };

  if (a.type === "proposeTrade") {
    if (byId(s, pid).bankrupt) return { ok: false, error: "you are bankrupt" };
    const other = s.players.find((p) => p.id === a.to);
    if (!other || other.bankrupt || other.id === pid) return { ok: false, error: "bad trade partner" };
    const bad = validateBundle(s, pid, a.give) ?? validateBundle(s, a.to, a.get);
    if (bad) return { ok: false, error: bad };
    s.trades.push({ id: newTradeId(s), from: pid, to: a.to, give: a.give, get: a.get });
    ev.push({ e: "info", text: `${byId(s, pid).name} proposed a trade to ${other.name}` });
    return { ok: true, state: s, events: ev };
  }

  const tr = s.trades.find((t) => t.id === a.id);
  if (!tr) return { ok: false, error: "trade not found" };

  if (a.type === "cancelTrade") {
    if (tr.from !== pid) return { ok: false, error: "not your proposal" };
    s.trades = s.trades.filter((t) => t.id !== a.id);
    return { ok: true, state: s, events: ev };
  }

  // respondTrade
  if (tr.to !== pid) return { ok: false, error: "not for you" };
  s.trades = s.trades.filter((t) => t.id !== a.id);
  if (a.accept) {
    // RE-VALIDATE: assets may have changed since the proposal.
    // Invalid -> still drop the trade (ok result so the removal persists), just don't execute.
    const bad = validateBundle(s, tr.from, tr.give) ?? validateBundle(s, tr.to, tr.get);
    if (bad) {
      ev.push({ e: "info", text: `trade cancelled — no longer valid (${bad})` });
      return { ok: true, state: s, events: ev };
    }
    execute(s, tr, ev);
  } else {
    ev.push({ e: "info", text: `${byId(s, pid).name} declined the trade` });
  }
  return { ok: true, state: s, events: ev };
}
