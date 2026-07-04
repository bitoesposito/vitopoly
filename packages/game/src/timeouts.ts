import type { AuctionFrame, ClientAction, GameState, PlayerId } from "./types";
import { activeNode } from "./engine";
import { cur } from "./flow";

// How long each wait-node gets before the server auto-resolves it.
export const TIMEOUT_MS: Record<string, number> = {
  preRoll: 60_000,
  buyPrompt: 30_000,
  postRoll: 60_000,
  auction: 20_000,
  debt: 120_000,
};

// The default action that unblocks the current wait. One action per alarm:
// every waiting player gets their full window (auction folds drain one per tick).
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
    case "auction": {
      const f = node as AuctionFrame;
      const p = f.active.find((x) => x !== f.leader);
      return p ? { pid: p, action: { type: "fold" } } : null;
    }
    case "debt":
      return { pid: node.debtor, action: { type: "payDebt" } };
  }
}
