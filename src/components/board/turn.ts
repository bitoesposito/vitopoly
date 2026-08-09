import { activeNode, BOARD, legalActions } from "@tangentopoly/game";
import type { DebtFrame, GameNode, Player, PublicState } from "@tangentopoly/game";
import { playerNames } from "@/lib/selectors";
import { translate } from "@/lib/i18n";

// La lettura del turno: una sola derivazione, consumata sia dai testi del centro sia
// dai bottoni della barra. Senza questa i due pezzi ricalcolerebbero le stesse cose e
// prima o poi divergerebbero.

export interface TurnView {
  node: GameNode;
  legal: Set<string>;
  isMyTurn: boolean;
  me?: Player;
  current?: Player;
  names: Record<string, string>;
  /** postRoll con doppio: si può ritirare senza chiudere il turno */
  again: boolean;
  canRoll: boolean;
  /** casella su cui sei fermo e che puoi comprare */
  buyTile: number | null;
  /** quanto manca per comprarla (0 = te la puoi permettere) */
  shortfall: number;
  /** il debito aperto, di chiunque sia */
  debt: DebtFrame | null;
  /** il debito è MIO */
  iOwe: boolean;
  owed: number;
  creditors: string;
}

export function turnView(game: PublicState, myId: string): TurnView {
  const node = activeNode(game);
  const me = game.players.find((p) => p.id === myId);
  const names = playerNames(game);
  const isMyTurn = game.players[game.current]?.id === myId;
  const again = game.phase.t === "postRoll" && game.phase.again && game.stack.length === 0;
  const legal = new Set<string>(legalActions(game, myId));
  const debt = node.t === "debt" ? node : null;
  const buyTile = node.t === "buyPrompt" && isMyTurn ? node.tile : null;

  return {
    node,
    legal,
    isMyTurn,
    me,
    current: game.players[game.current],
    names,
    again,
    canRoll: isMyTurn && ((node.t === "preRoll" && legal.has("roll")) || again),
    buyTile,
    shortfall: buyTile === null ? 0 : Math.max(0, (BOARD[buyTile].price ?? 0) - (me?.cash ?? 0)),
    debt,
    iOwe: debt?.debtor === myId,
    owed: debt?.claims.reduce((s, c) => s + c.amount, 0) ?? 0,
    creditors: debt
      ? [...new Set(debt.claims.map((c) => (c.creditor === "bank" ? translate("ev.bank") : (names[c.creditor] ?? "?"))))].join(", ")
      : "",
  };
}
