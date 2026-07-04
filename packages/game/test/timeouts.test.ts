import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { timeoutAction } from "../src/timeouts";
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

    // auction -> first non-leader folds
    s.stack.push({ t: "auction", tile: 1, queue: [], bid: 10, leader: "a", active: ["a", "b"] });
    expect(timeoutAction(s)).toEqual({ pid: "b", action: { type: "fold" } });

    // debt -> payDebt (server falls back to bankrupt on failure)
    s.stack.push({ t: "debt", debtor: "b", claims: [{ creditor: "bank", amount: 10 }] });
    expect(timeoutAction(s)).toEqual({ pid: "b", action: { type: "payDebt" } });
  });

  it("repeated timeouts drain an auction to settlement", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    let guard = 0;
    while (s.status === "playing" && guard++ < 20) {
      const t = timeoutAction(s);
      if (!t) break;
      const r = apply(s, t.pid, t.action);
      if (!r.ok) break;
      s = r.state;
      if (s.stack.length === 0 && s.phase.t === "preRoll") break; // turn moved on
    }
    expect(s.stack).toHaveLength(0); // no frame left stuck
  });
});
