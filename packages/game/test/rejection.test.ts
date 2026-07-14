import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { started } from "./helpers";
import type { AuctionFrame, ClientAction, DebtFrame, GameState } from "../src/types";

// Every action that isn't a key in the active node's handler table must be structurally rejected.
// This proves the dispatcher — not scattered if-guards — protects the machine.
// (Trades, votekick and the cash raisers mortgage/sellHouse are orthogonal regions,
// routed outside the table — always legal, so excluded from this matrix.)

const ALL_ACTIONS: ClientAction[] = [
  { type: "roll" },
  { type: "payBail" },
  { type: "useJailCard" },
  { type: "buy" },
  { type: "decline" },
  { type: "bid", amount: 10 },
  { type: "fold" },
  { type: "build", tile: 1 },
  { type: "unmortgage", tile: 1 },
  { type: "payDebt" },
  { type: "bankrupt" },
  { type: "endTurn" },
  { type: "start" },
];

// which actions each node's handler table mounts (mirror of HANDLERS in engine.ts)
const LEGAL: Record<string, Set<string>> = {
  preRoll: new Set(["roll", "payBail", "useJailCard"]),
  buyPrompt: new Set(["buy", "decline"]),
  postRoll: new Set(["endTurn", "build", "unmortgage"]),
  auction: new Set(["bid", "fold"]),
  debt: new Set(["payDebt", "bankrupt"]),
};

function assertMatrix(s: GameState, nodeKind: string) {
  for (const a of ALL_ACTIONS) {
    if (LEGAL[nodeKind].has(a.type)) continue; // legality of allowed actions is covered per-feature
    const r = apply(s, "a", a);
    expect(r.ok, `${a.type} should be rejected during ${nodeKind}`).toBe(false);
  }
}

describe("structural rejection matrix", () => {
  it("preRoll", () => assertMatrix(started(), "preRoll"));

  it("buyPrompt", () => {
    const s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    assertMatrix(s, "buyPrompt");
  });

  it("postRoll", () => {
    const s = started();
    s.phase = { t: "postRoll", again: false };
    assertMatrix(s, "postRoll");
  });

  it("auction frame blocks everything but bid/fold", () => {
    const s = started();
    const auction: AuctionFrame = { t: "auction", tile: 1, queue: [], bid: 0, leader: null, active: ["a", "b"], bids: [] };
    s.stack.push(auction);
    assertMatrix(s, "auction");
  });

  it("debt frame blocks everything but payDebt/bankrupt", () => {
    const s = started();
    const debt: DebtFrame = { t: "debt", debtor: "a", claims: [{ creditor: "bank", amount: 100 }] };
    s.stack.push(debt);
    assertMatrix(s, "debt");
  });
});
