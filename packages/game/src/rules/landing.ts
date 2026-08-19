import type { GameState, Player } from "../types";
import { BOARD } from "../data/tiles";
import { rentFor } from "./rent";

// Cosa VUOLE che succeda una casella. Funzione pura: descrive, non tocca mai
// phase/stack né i giocatori. Ad agire è core/movement.ts.

type Outcome =
  | { t: "none" }
  | { t: "offerBuy"; tile: number }
  | { t: "charge"; amount: number; to: string; why: string } // to: PlayerId | "bank"
  | { t: "card"; deck: "chance" | "chest" }
  | { t: "goToJail" }
  | { t: "vacation" };

/** L'unico switch "cosa succede se atterro su X". */
export function landing(s: GameState, p: Player, diceTotal: number): Outcome {
  const tile = BOARD[p.pos];
  switch (tile.kind) {
    case "gotojail":
      return { t: "goToJail" };
    case "street":
    case "railroad":
    case "utility": {
      const own = s.props[p.pos];
      if (!own) return { t: "offerBuy", tile: p.pos };
      if (own.owner === p.id || own.mortgaged) return { t: "none" };
      const rent = rentFor(s, p.pos, diceTotal);
      return rent > 0 ? { t: "charge", amount: rent, to: own.owner, why: `rent ${tile.name}` } : { t: "none" };
    }
    case "tax":
      return { t: "charge", amount: tile.taxAmount!, to: "bank", why: "tax" };
    case "chance":
      return { t: "card", deck: "chance" };
    case "chest":
      return { t: "card", deck: "chest" };
    case "parking":
      return { t: "vacation" };
    default:
      return { t: "none" }; // via, prigione (di passaggio)
  }
}
