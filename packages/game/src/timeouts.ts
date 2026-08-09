import type { AuctionFrame, ClientAction, GameState, PlayerId } from "./types";
import { activeNode } from "./core/nodes";
import { cur } from "./core/players";

// Quanto tempo ha ogni nodo d'attesa prima che il server lo risolva da solo.

export const TIMEOUT_MS: Record<string, number> = {
  preRoll: 60_000,
  buyPrompt: 30_000,
  postRoll: 60_000,
  debt: 120_000,
};

/** Le aste hanno un orologio proprio: 10s per aprire, 6s dopo ogni offerta. */
export const AUCTION_MS = { start: 10_000, bid: 6_000 };

export function timeoutMs(s: GameState): number {
  const node = activeNode(s);
  if (node.t === "auction") return (node as AuctionFrame).bids.length ? AUCTION_MS.bid : AUCTION_MS.start;
  return TIMEOUT_MS[node.t];
}

/** L'azione di default che sblocca l'attesa corrente. Le aste no: le chiude
 *  auctionTimeout (aggiudicazione lato server, non una ClientAction). Per il debito il
 *  server prova questa e poi ripiega sulla bancarotta. */
export function timeoutAction(s: GameState): { pid: PlayerId; action: ClientAction } | null {
  if (s.status !== "playing") return null;
  const node = activeNode(s);
  switch (node.t) {
    case "preRoll":
      return { pid: cur(s).id, action: { type: "roll" } };
    case "buyPrompt":
      return { pid: cur(s).id, action: { type: "decline" } };
    case "postRoll":
      return { pid: cur(s).id, action: { type: "endTurn" } };
    case "auction":
      return null;
    case "debt":
      return { pid: node.debtor, action: { type: "payDebt" } };
  }
}
