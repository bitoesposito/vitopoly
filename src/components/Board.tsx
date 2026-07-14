import { BOARD } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Tile } from "./Tile";
import { Center } from "./Center";
import { AuctionDialog } from "./AuctionDialog";
import { Tokens } from "./Tokens";
import { tileCell } from "@/lib/utils";

export function Board({ game }: { game: PublicState }) {
  // square board; gap-px + bg-border = uniform grid lines
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
      <Tokens game={game} />
      <AuctionDialog game={game} />
    </div>
  );
}
