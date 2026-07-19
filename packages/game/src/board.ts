import type { GameState, Player } from "./types";
import { BOARD, GO_SALARY } from "./board-data";
import { rentFor } from "./rent";

// What a tile WANTS to happen. board.ts describes, never mutates phase/stack. flow.ts acts on it.
export type Outcome =
  | { t: "none" }
  | { t: "offerBuy"; tile: number }
  | { t: "charge"; amount: number; to: string; why: string } // to: PlayerId | "bank"
  | { t: "card"; deck: "chance" | "chest" }
  | { t: "goToJail" }
  | { t: "vacation" };

// Move a player `steps` forward, paying GO salary on pass/land. Mutates player.
export function advance(_s: GameState, p: Player, steps: number): { from: number; to: number; passedGo: boolean } {
  const from = p.pos;
  p.pos = (from + steps) % BOARD.length;
  const passedGo = p.pos < from || steps >= BOARD.length;
  if (passedGo) p.cash += GO_SALARY;
  return { from, to: p.pos, passedGo };
}

// The single switch: "what happens when I land on X".
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
      return { t: "none" }; // go, jail (just visiting)
  }
}
