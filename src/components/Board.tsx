import { BOARD } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Tile } from "./Tile";
import { Center } from "./Center";
import { AuctionDialog } from "./AuctionDialog";

// Map a tile index 0..39 to an 11x11 grid cell. GO (0) sits top-left.
function tileCell(i: number): { row: number; col: number } {
  if (i <= 10) return { row: 1, col: 1 + i }; // top edge, left -> right
  if (i <= 20) return { row: 1 + (i - 10), col: 11 }; // right edge, top -> bottom
  if (i <= 30) return { row: 11, col: 11 - (i - 20) }; // bottom edge, right -> left
  return { row: 11 - (i - 30), col: 1 }; // left edge, bottom -> top
}

export function Board({ game }: { game: PublicState }) {
  // sempre quadrato: solo il lato è vincolato (w-full + cap vmin), l'altezza segue via aspect-square.
  // gap-px + bg-border = linee di griglia uniformi (niente bordi doppi né artefatti subpixel).
  return (
    <div
      className="relative m-auto grid aspect-square w-full h-full gap-px border border-border bg-border max-h-screen flex-1"
      style={{
        gridTemplateColumns: "1.55fr repeat(9, 1fr) 1.55fr",
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
      <AuctionDialog game={game} />
    </div>
  );
}
