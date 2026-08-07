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
  return (
    // sempre quadrata: larghezza = min(spazio orizzontale, altezza viewport - gutter), aspect-square fa il resto
    <div
      // gap-px su paper-line: il filo tra due note è una riga incisa
      className="filetto tratteggio relative m-auto grid aspect-square min-h-0 w-full gap-px border bg-paper-line md:w-[min(100%,100dvh_-_2.5rem)]"
      // containerType inline-size: la tipografia delle celle è in cqi, quindi la plancia
      // RIMPICCIOLISCE invece di andare a capo — meglio minuscolo intero che leggibile spezzato.
      style={{
        containerType: "inline-size",
        // minmax(0,…) e non 1fr: 1fr non scende sotto il min-content, e i nomi lunghi
        // spingevano la griglia oltre l'aspect-square fino a uscire dal viewport
        gridTemplateColumns: "minmax(0, 1.55fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.55fr)",
        gridTemplateRows: "minmax(0, 1.55fr) repeat(9, minmax(0, 1fr)) minmax(0, 1.55fr)",
      }}
    >
      {BOARD.map((_, i) => {
        const { row, col } = tileCell(i);
        return (
          // grid (non block): il button è un item stretchato, MAI su una baseline di testo —
          // l'inline-block dentro un div si sfalsa con le metriche del font caricato.
          // inert: lo scrim è solo visivo, senza questo le celle restano operabili
          <div key={i} className="grid min-h-0 min-w-0" style={{ gridRow: row, gridColumn: col }} inert={auctionLive}>
            <Tile index={i} game={game} />
          </div>
        );
      })}
      <div className="grid min-h-0 min-w-0" style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}>
        <Center game={game} />
      </div>
      <Tokens game={game} />
      <EventCardOverlay />
      {auctionLive && <div className="absolute inset-0 z-40 bg-background/50" aria-hidden />}
    </div>
  );
}
