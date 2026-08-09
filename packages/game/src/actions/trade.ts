import type { Bundle, ClientAction, GameEvent, GameState, PlayerId, Result, TileId, Trade } from "../types";
import { BOARD, groupTiles } from "../data/tiles";
import { transfer } from "../core/money";
import { byId } from "../core/players";
import { err, ok } from "../core/result";
import { nextInt } from "../rng";

// Regione ortogonale: gli scambi vivono ACCANTO al turno, non dentro. Vietati solo
// durante un'asta (uno scambio che prosciuga il miglior offerente renderebbe
// l'aggiudicazione insolvente).

type TradeAction = Extract<ClientAction, { type: `${string}Trade` }>;

/** Id deterministico: avanza il seed, l'unicità fra gli scambi vivi basta. */
const newTradeId = (s: GameState): string => `t${nextInt(s, 1_000_000_000)}`;

/** Un'operazione che cambia il valore di una proprietà (ipoteca, riscatto, vendita,
 *  edifici) invalida ogni scambio pendente che la contiene: l'offerta non è più quella
 *  pattuita. Chiamata dopo ogni asset-op riuscita. */
export function voidTradesTouching(s: GameState, tile: TileId): GameEvent[] {
  const hit = s.trades.filter((t) => t.give.props.includes(tile) || t.get.props.includes(tile));
  if (hit.length === 0) return [];
  s.trades = s.trades.filter((t) => !hit.includes(t));
  return hit.map((t) => ({
    e: "info",
    text: `scambio ${byId(s, t.from).name} ↔ ${byId(s, t.to).name} annullato — ${BOARD[tile].name} è cambiata`,
  }));
}

function validateBundle(s: GameState, pid: PlayerId, b: Bundle): string | null {
  const p = byId(s, pid);
  if (b.cash < 0 || !Number.isInteger(b.cash)) return "cifra non valida";
  if (b.cash > p.cash) return "contanti insufficienti";
  if (b.jailCards > p.jailCards) return "carte prigione insufficienti";
  for (const t of b.props) {
    const own = s.props[t];
    if (!own || own.owner !== pid) return `non possiedi ${BOARD[t].name}`;
    const group = BOARD[t].group;
    if (group && groupTiles(group).some((g) => (s.props[g]?.houses ?? 0) > 0)) return "il gruppo ha edifici — vendili prima";
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
  ev.push({ e: "traded", from: tr.from, to: tr.to, give: tr.give, get: tr.get }); // strutturato: la UI anima lo scambio
}

export function handleTrade(s: GameState, pid: PlayerId, a: TradeAction): Result {
  if (s.stack.some((f) => f.t === "auction")) return err("niente scambi durante un'asta");
  if (a.type === "proposeTrade") return propose(s, pid, a);

  const tr = s.trades.find((t) => t.id === a.id);
  if (!tr) return err("scambio non trovato");

  if (a.type === "cancelTrade") {
    if (tr.from !== pid) return err("non è una tua proposta");
    s.trades = s.trades.filter((t) => t.id !== a.id);
    return ok(s);
  }

  if (tr.to !== pid) return err("non è per te");
  s.trades = s.trades.filter((t) => t.id !== a.id);
  const ev: GameEvent[] = [];
  if (!a.accept) {
    ev.push({ e: "info", text: `${byId(s, pid).name} rifiuta lo scambio` });
    return ok(s, ev);
  }
  // RI-VALIDA: il patrimonio può essere cambiato dopo la proposta. Se non regge, lo
  // scambio si butta comunque (risultato ok, così la rimozione persiste) senza eseguirlo.
  const bad = validateBundle(s, tr.from, tr.give) ?? validateBundle(s, tr.to, tr.get);
  if (bad) {
    ev.push({ e: "info", text: `scambio annullato — non più valido (${bad})` });
    return ok(s, ev);
  }
  execute(s, tr, ev);
  return ok(s, ev);
}

function propose(s: GameState, pid: PlayerId, a: Extract<TradeAction, { type: "proposeTrade" }>): Result {
  if (byId(s, pid).bankrupt) return err("sei in bancarotta");
  const other = s.players.find((p) => p.id === a.to);
  if (!other || other.bankrupt || other.id === pid) return err("controparte non valida");
  const bad = validateBundle(s, pid, a.give) ?? validateBundle(s, a.to, a.get);
  if (bad) return err(bad);
  s.trades.push({ id: newTradeId(s), from: pid, to: a.to, give: a.give, get: a.get });
  return ok(s, [{ e: "info", text: `${byId(s, pid).name} propone uno scambio a ${other.name}` }]);
}
