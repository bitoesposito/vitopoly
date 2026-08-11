import { BOARD, sellValue } from "@tangentopoly/game";
import type { GameEvent, PublicState } from "@tangentopoly/game";
import type { FeedItem } from "./store";

// Derivazioni pure sullo stato pubblico. Nessuna di queste è una regola: le regole
// stanno nel motore. Qui c'è solo quello che la UI chiede allo stato più di una volta.

export const playerNames = (game: PublicState): Record<string, string> => Object.fromEntries(game.players.map((p) => [p.id, p.name]));

export const ownedTiles = (game: PublicState, pid: string): number[] =>
  Object.entries(game.props)
    .filter(([, o]) => o!.owner === pid)
    .map(([k]) => Number(k));

export const isMyTurn = (game: PublicState, pid: string): boolean => game.players[game.current]?.id === pid;

/** Un'asta in corso vieta scambi, espulsioni e ritiro volontario: il motore la usa come
 *  guardia, la UI per spegnere i bottoni prima che l'utente ci provi. */
export const auctionLive = (game: PublicState): boolean => game.stack.some((f) => f.t === "auction");

/** Quanto vali davvero: contante più quello che la banca ti darebbe liquidando adesso —
 *  edifici a metà del costo, titoli al prezzo di svendita. La classifica finale è una cifra
 *  realizzabile, non un prezzo di listino. */
export function netWorth(game: PublicState, pid: string): number {
  let v = game.players.find((p) => p.id === pid)?.cash ?? 0;
  for (const [id, own] of Object.entries(game.props)) {
    if (!own || own.owner !== pid) continue;
    const tile = Number(id);
    v += own.houses * ((BOARD[tile].houseCost ?? 0) / 2);
    v += sellValue(tile, own.mortgaged);
  }
  return v;
}

/** L'ultimo tiro: le facce e l'identità del lancio. `spin` viene dal seq del registro di
 *  sessione, che cambia solo a tiro nuovo — gli oggetti di `log` arrivano sostituiti a ogni
 *  messaggio e non servono da identità. Chi entra a metà turno le legge dallo stato con
 *  spin 0: vede le facce senza vedere un lancio a cui non ha assistito. */
export type Roll = Extract<GameEvent, { e: "rolled" }> & { spin: number };

export function lastRoll(feed: FeedItem[], log: GameEvent[]): Roll | null {
  for (let i = feed.length - 1; i >= 0; i--) {
    const f = feed[i];
    if ("ev" in f && f.ev.e === "rolled") return { ...f.ev, spin: f.seq };
  }
  for (let i = log.length - 1; i >= 0; i--)
    if (log[i].e === "rolled") return { ...(log[i] as Extract<GameEvent, { e: "rolled" }>), spin: 0 };
  return null;
}
