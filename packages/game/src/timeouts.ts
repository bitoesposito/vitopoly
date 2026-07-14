import type { AuctionFrame, ClientAction, GameState, PlayerId } from "./types";
import { activeNode } from "./engine";
import { cur } from "./flow";

// How long each wait-node gets before the server auto-resolves it.
export const TIMEOUT_MS: Record<string, number> = {
  preRoll: 60_000,
  buyPrompt: 30_000,
  postRoll: 60_000,
  debt: 120_000,
};

// Auctions run on their own clock: 10s to open, 6s after every bid.
export const AUCTION_MS = { start: 10_000, bid: 6_000 };

export function timeoutMs(s: GameState): number {
  const node = activeNode(s);
  if (node.t === "auction") return (node as AuctionFrame).bids.length ? AUCTION_MS.bid : AUCTION_MS.start;
  return TIMEOUT_MS[node.t];
}

// The default action that unblocks the current wait. Auctions are handled by
// auctionTimeout (a server-only settle, not a client action) — see resolveTimeout.
// For debt the server tries this first, then falls back to bankrupt.
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
      return null; // timer expiry settles the auction: engine.auctionTimeout()
    case "debt":
      return { pid: node.debtor, action: { type: "payDebt" } };
  }
}
