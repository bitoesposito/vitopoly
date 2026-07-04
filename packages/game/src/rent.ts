import type { GameState, TileId } from "./types";
import { BOARD, groupTiles } from "./board-data";

// Pure math: what does landing on `tile` cost? 0 = no rent (unowned/mortgaged/self handled by caller).
export function rentFor(s: GameState, tile: TileId, diceTotal: number): number {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.mortgaged) return 0;
  if (s.settings.noRentInPrison && s.players.find((p) => p.id === own.owner)?.inJail) return 0;

  if (def.kind === "street") {
    if (own.houses > 0) return def.rent![own.houses];
    const monopoly = groupTiles(def.group!).every((t) => s.props[t]?.owner === own.owner);
    return monopoly && s.settings.doubleRentFullSet ? def.rent![0] * 2 : def.rent![0];
  }
  if (def.kind === "railroad") {
    const count = BOARD.filter((t, i) => t.kind === "railroad" && s.props[i]?.owner === own.owner).length;
    return 25 * 2 ** (count - 1);
  }
  if (def.kind === "utility") {
    const both = BOARD.filter((t, i) => t.kind === "utility" && s.props[i]?.owner === own.owner).length === 2;
    return (both ? 10 : 4) * diceTotal;
  }
  return 0;
}
