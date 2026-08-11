import type { ClientAction, GameNode, GameState, PlayerId, Result } from "./types";
import { activeNode } from "./core/nodes";
import { clone, err, type Handler } from "./core/result";
import { assetOp, spendingAction, type AssetOp } from "./actions/assets";
import { bid, fold } from "./actions/auction";
import { bankrupt, payDebt, quitGame } from "./actions/debt";
import { lobby, rematch } from "./actions/lobby";
import { buy, decline } from "./actions/purchase";
import { handleTrade } from "./actions/trade";
import { endTurn, payBail, roll, rollAgain, useJailCard } from "./actions/turn";
import { votekick } from "./actions/votekick";
import * as property from "./rules/property";

// L'unica porta d'ingresso del motore. Qui non ci sono regole: c'è la TOPOLOGIA del
// regolamento — quale azione è raggiungibile da quale nodo — e il modo in cui si entra.

const build = spendingAction(property.build);
const unmortgage = spendingAction(property.unmortgage);

/** La tabella È il regolamento: nodo attivo -> azioni raggiungibili. legalActions e il
 *  gate di apply() leggono la stessa struttura, quindi non possono divergere. */
const HANDLERS: Record<GameNode["t"], Partial<Record<ClientAction["type"], Handler>>> = {
  preRoll: { roll, payBail, useJailCard, build, unmortgage },
  buyPrompt: { buy, decline },
  postRoll: { endTurn, roll: rollAgain, build, unmortgage },
  auction: { bid, fold },
  debt: { payDebt, bankrupt },
};

// Cosa deve fare il giocatore adesso. Il testo non nomina mai i nodi.
const WHY_NOT: Record<GameNode["t"], string> = {
  preRoll: "prima tira i dadi",
  buyPrompt: "prima decidi se comprare",
  postRoll: "chiudi il turno per continuare",
  auction: "c'è un'asta in corso",
  debt: "prima salda il debito",
};

// Raccogli-cassa: il proprio patrimonio si smonta SEMPRE, in qualunque momento della
// partita e anche fuori dal proprio turno. Non tocca né fase né stack, quindi non passa
// dalla tabella dei nodi e non ha bisogno di un turno.
const CASH_RAISERS = {
  mortgage: property.mortgage,
  sellHouse: property.sellHouse,
  sellProperty: property.sellProperty,
} satisfies Partial<Record<AssetOp, unknown>>;

export function apply(state: GameState, pid: PlayerId, a: ClientAction): Result {
  if (state.status === "ended") return a.type === "rematch" ? rematch(state, pid) : err("partita finita");
  if (state.status === "lobby") return lobby(clone(state), pid, a);

  // regioni ortogonali: vivono accanto al turno, non dentro un nodo
  if (a.type === "proposeTrade" || a.type === "respondTrade" || a.type === "cancelTrade") return handleTrade(clone(state), pid, a);
  if (a.type === "votekick") return votekick(clone(state), pid, a.target);
  if (a.type === "mortgage" || a.type === "sellHouse" || a.type === "sellProperty")
    return assetOp(clone(state), pid, a.tile, a.type, CASH_RAISERS[a.type]);

  const top = activeNode(state);
  // ritiro volontario: sempre possibile. La bancarotta CON un debito aperto resta
  // sull'handler del nodo debt, dove i creditori vengono pagati sul ricavato.
  if (a.type === "bankrupt" && !(top.t === "debt" && top.debtor === pid)) return quitGame(clone(state), pid);

  const h = HANDLERS[top.t][a.type];
  if (!h) return err(`Non puoi farlo adesso: ${WHY_NOT[top.t]}`); // rifiuto strutturale
  return h(clone(state), pid, a);
}

/** Derivata dalla STESSA tabella. Alimenta i bottoni del client e il soak test. */
export function legalActions(s: Pick<GameState, "status" | "phase" | "stack">): ClientAction["type"][] {
  if (s.status === "lobby") return ["start", "profile"];
  if (s.status === "ended") return ["rematch"];
  const base = Object.keys(HANDLERS[activeNode(s).t]) as ClientAction["type"][];
  return [...base, ...(Object.keys(CASH_RAISERS) as ClientAction["type"][])];
}

export { activeNode };
export { auctionTimeout } from "./actions/auction";
