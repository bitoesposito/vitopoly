import type { AuctionFrame, GameEvent, GameState, TileId } from "../types";
import { BOARD } from "../data/tiles";
import { transfer } from "./money";
import { alive } from "./players";

// Il ciclo di vita di un frame d'asta. Chi offre e chi passa sta in actions/auction.ts:
// qui c'è solo l'apertura e la chiusura.

export function pushAuction(s: GameState, tile: TileId, queue: TileId[]): void {
  s.stack.push({ t: "auction", tile, queue, bid: 0, leader: null, active: alive(s).map((p) => p.id), bids: [] });
}

/** Aggiudica al miglior offerente (o a nessuno) e, se il patrimonio di un fallito ha
 *  lasciato altri titoli in coda, apre subito l'asta successiva. */
export function settleAuction(s: GameState, frame: AuctionFrame, ev: GameEvent[]): void {
  if (frame.leader) {
    transfer(s, frame.leader, "bank", frame.bid, "auction", ev);
    s.props[frame.tile] = { owner: frame.leader, mortgaged: false, houses: 0 };
    ev.push({ e: "auctionWon", pid: frame.leader, tile: frame.tile, price: frame.bid });
  } else {
    ev.push({ e: "info", text: `nessuna offerta per ${BOARD[frame.tile].name}` });
  }
  s.stack.pop();
  if (frame.queue.length > 0) pushAuction(s, frame.queue[0], frame.queue.slice(1));
}
