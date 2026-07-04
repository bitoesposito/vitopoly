import { BOARD } from "@vitopoly/game";
import type { PublicState } from "@vitopoly/game";
import { Tile } from "./Tile";
import { Center } from "./Center";

// Map a tile index 0..39 to an 11x11 grid cell. GO (0) sits bottom-right.
function tileCell(i: number): { row: number; col: number } {
  if (i <= 10) return { row: 11, col: 11 - i }; // bottom edge, right -> left
  if (i <= 20) return { row: 11 - (i - 10), col: 1 }; // left edge, bottom -> top
  if (i <= 30) return { row: 1, col: 1 + (i - 20) }; // top edge, left -> right
  return { row: 1 + (i - 30), col: 11 }; // right edge, top -> bottom
}

export function Board({ game }: { game: PublicState }) {
  return (
    <div
      className="grid aspect-square w-full max-w-[min(94vmin,880px)] gap-[3px] rounded-lg p-1"
      style={{
        gridTemplateColumns: "1.55fr repeat(9, 1fr) 1.55fr", // richup-style: corners big, edges squeezed
        gridTemplateRows: "1.55fr repeat(9, 1fr) 1.55fr",
      }}
    >
      {BOARD.map((_, i) => {
        const { row, col } = tileCell(i);
        return (
          <div key={i} className="min-h-0 min-w-0" style={{ gridRow: row, gridColumn: col }}>
            <Tile index={i} game={game} />
          </div>
        );
      })}
      <div className="min-h-0 min-w-0" style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}>
        <Center game={game} />
      </div>
    </div>
  );
}
