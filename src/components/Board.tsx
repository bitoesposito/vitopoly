import { activeNode, BOARD } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Tile } from "./Tile";
import { Center } from "./Center";
import { EventCardOverlay } from "./EventCard";
import { Tokens } from "./Tokens";
import { tileCell } from "@/lib/utils";

export function Board({ game }: { game: PublicState }) {
  // l'asta è un interrupt di gioco: board bloccata (niente blur), si agisce dal pannello asta
  const auctionLive = game.status === "playing" && activeNode(game).t === "auction";
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
      <EventCardOverlay />
      {auctionLive && <div className="absolute inset-0 z-40 bg-background/50" aria-hidden />}
    </div>
  );
}
