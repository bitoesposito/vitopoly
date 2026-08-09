import type { GameEvent, GameState, PlayerId, Result, TileId } from "../types";
import { byId } from "../core/players";
import { err, ok, type Handler } from "../core/result";
import { voidTradesTouching } from "./trade";

// Le operazioni sul proprio patrimonio. Le REGOLE stanno in rules/property.ts: qui c'è
// solo il momento in cui si possono fare, e l'evento che ne racconta l'effetto.

export type AssetOp = "build" | "sellHouse" | "mortgage" | "unmortgage" | "sellProperty";
type Mutator = (s: GameState, pid: PlayerId, tile: TileId) => string | null;

/** Esegue l'operazione, emette l'evento `asset` (importo = variazione di cassa) e
 *  invalida gli scambi pendenti che toccano quella casella. */
export function assetOp(s: GameState, pid: PlayerId, tile: TileId, what: AssetOp, fn: Mutator): Result {
  const cashBefore = byId(s, pid).cash;
  const housesBefore = s.props[tile]?.houses ?? 0;
  const e = fn(s, pid, tile);
  if (e) return err(e);
  const hotel = housesBefore === 5 || (s.props[tile]?.houses ?? 0) === 5;
  const ev: GameEvent[] = [{ e: "asset", pid, tile, what, amount: Math.abs(byId(s, pid).cash - cashBefore), hotel }];
  ev.push(...voidTradesTouching(s, tile));
  return ok(s, ev);
}

/** build/unmortgage SPENDONO contanti, quindi passano dalla tabella dei nodi (solo nel
 *  tuo preRoll/postRoll): un leader d'asta che scende sotto la propria offerta andrebbe
 *  in negativo all'aggiudicazione. I raccogli-cassa mortgage/sellHouse/sellProperty
 *  entrano invece dal canale ortogonale di apply(). */
export function spendingAction(fn: Mutator): Handler {
  return (s, pid, a) => {
    if (!("tile" in a)) return err("azione non valida");
    if (s.players[s.current]?.id !== pid) return err("non è il tuo turno");
    return assetOp(s, pid, a.tile, a.type as AssetOp, fn);
  };
}
