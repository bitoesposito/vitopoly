import { activeNode, BOARD } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Tile } from "./Tile";
import { Center } from "./Center";
import { EventCardOverlay } from "@/components/EventCard";
import { Tokens } from "./Tokens";
import { tileCell } from "@/lib/board-layout";
import { useGame } from "@/lib/store";

export function Board({ game }: { game: PublicState }) {
  const landed = useGame((s) => s.landed);
  // l'asta è un interrupt di gioco: board bloccata (niente blur), si agisce dal pannello asta
  const auctionLive = game.status === "playing" && activeNode(game).t === "auction";
  return (
    // Sempre quadrata: larghezza = min(spazio orizzontale, altezza libera), e aspect-square
    // fa il resto. 4.5rem = i gutter (2.5) più la fascia della testata col filetto (2).
    // shrink-0: la colonna ha altezza fissa da sm, e una plancia che non ci sta si scorre —
    // non si deforma.
    <div
      // gap-px su paper-line: il filo tra due note è una riga incisa
      className="filetto tratteggio relative m-auto grid aspect-square min-h-0 w-full shrink-0 gap-px border bg-paper-line md:w-[min(100%,100dvh_-_4.5rem)]"
      // containerType inline-size: la tipografia delle celle è in cqi, quindi la plancia
      // RIMPICCIOLISCE invece di andare a capo — meglio minuscolo intero che leggibile spezzato.
      style={{
        containerType: "inline-size",
        // minmax(0,…) e non 1fr: 1fr non scende sotto il min-content, e un nome lungo
        // sfonderebbe l'aspect-square
        gridTemplateColumns: "minmax(0, 1.55fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.55fr)",
        gridTemplateRows: "minmax(0, 1.55fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.55fr)",
      }}
    >
      {BOARD.map((_, i) => {
        const { row, col } = tileCell(i);
        return (
          // grid (non block): il button è un item stretchato, mai su una baseline di testo,
          // che si sfalserebbe con le metriche del font caricato.
          <div key={i} className="grid min-h-0 min-w-0" style={{ gridRow: row, gridColumn: col }}>
            <Tile index={i} game={game} landed={landed === i} />
          </div>
        );
      })}
      <div className="grid min-h-0 min-w-0" style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}>
        <Center game={game} />
      </div>
      <Tokens game={game} />
      <EventCardOverlay />
      {/* velo, non blocco: durante l'asta si deve poter ipotecare/svendere dalla casella
          per fare cassa. Il centro non offre azioni in fase d'asta, quindi non serve inertizzarlo. */}
      {auctionLive && <div className="pointer-events-none absolute inset-0 z-40 bg-background/50" aria-hidden />}
    </div>
  );
}
