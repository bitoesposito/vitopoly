import { describe, expect, it } from "vitest";
import { activeNode, apply, auctionTimeout } from "../src/engine";
import { AUCTION_MS, timeoutAction, timeoutMs } from "../src/timeouts";
import { started } from "./helpers";

describe("timeoutAction", () => {
  it("resolves every wait node with a legal default", () => {
    // preRoll -> roll
    const s = started();
    expect(timeoutAction(s)).toEqual({ pid: "a", action: { type: "roll" } });

    // buyPrompt -> decline
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    expect(timeoutAction(s)?.action.type).toBe("decline");

    // postRoll -> endTurn
    s.phase = { t: "postRoll", again: false };
    expect(timeoutAction(s)?.action.type).toBe("endTurn");

    // auction -> no client action: the server settles via auctionTimeout
    s.stack.push({ t: "auction", tile: 1, queue: [], bid: 10, leader: "a", active: ["a", "b"], bids: [{ pid: "a", amount: 10 }] });
    expect(timeoutAction(s)).toBeNull();

    // debt -> payDebt (server falls back to bankrupt on failure)
    s.stack.push({ t: "debt", debtor: "b", claims: [{ creditor: "bank", amount: 10 }] });
    expect(timeoutAction(s)).toEqual({ pid: "b", action: { type: "payDebt" } });
  });

  it("auction windows: 10s to open, 6s after a bid", () => {
    const s = started();
    s.phase = { t: "postRoll", again: false };
    s.stack.push({ t: "auction", tile: 1, queue: [], bid: 0, leader: null, active: ["a", "b"], bids: [] });
    expect(timeoutMs(s)).toBe(AUCTION_MS.start);
    const r = apply(s, "b", { type: "bid", amount: 2 });
    if (!r.ok) throw new Error(r.error);
    expect(timeoutMs(r.state)).toBe(AUCTION_MS.bid);
  });

  it("repeated timeouts drain an auction to settlement", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    let guard = 0;
    while (s.status === "playing" && guard++ < 20) {
      // mirrors the room's alarm: auctions settle by timer, everything else by default action
      let r;
      if (activeNode(s).t === "auction") {
        r = auctionTimeout(s);
      } else {
        const t = timeoutAction(s);
        if (!t) break;
        r = apply(s, t.pid, t.action);
      }
      if (!r.ok) break;
      s = r.state;
      if (s.stack.length === 0 && s.phase.t === "preRoll") break; // turn moved on
    }
    expect(s.stack).toHaveLength(0); // no frame left stuck
  });
});
