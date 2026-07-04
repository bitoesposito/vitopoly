import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { started } from "./helpers";
import { checkInvariants } from "./invariants";
import type { ClientAction, GameState, PlayerId } from "../src/types";

function step(s: GameState, pid: PlayerId, a: ClientAction): GameState {
  const r = apply(s, pid, a);
  if (!r.ok) throw new Error(`${pid} ${a.type}: ${r.error}`);
  checkInvariants(r.state);
  return r.state;
}

describe("buy / decline / auction", () => {
  it("buy assigns the property and resumes postRoll", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false }; // Mediterranean, $60
    s = step(s, "a", { type: "buy" });
    expect(s.props[1]).toEqual({ owner: "a", mortgaged: false, houses: 0 });
    expect(s.players[0].cash).toBe(1440);
    expect(s.phase).toEqual({ t: "postRoll", again: false });
  });

  it("buy rejected without cash", () => {
    const s = started();
    s.phase = { t: "buyPrompt", tile: 39, again: false }; // Boardwalk $400
    s.players[0].cash = 100;
    expect(apply(s, "a", { type: "buy" }).ok).toBe(false);
  });

  it("decline opens an auction for everyone; winner pays and owns", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    s = step(s, "a", { type: "decline" });
    expect(s.stack[0]?.t).toBe("auction");

    s = step(s, "b", { type: "bid", amount: 30 });
    s = step(s, "a", { type: "bid", amount: 40 }); // decliner can bid too
    s = step(s, "b", { type: "fold" });

    expect(s.stack).toHaveLength(0); // settled, popped
    expect(s.props[1]?.owner).toBe("a");
    expect(s.players[0].cash).toBe(1460);
    expect(s.phase).toEqual({ t: "postRoll", again: false }); // frozen phase resumed
  });

  it("nobody bids -> property stays unowned", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    s = step(s, "a", { type: "decline" });
    s = step(s, "a", { type: "fold" });
    s = step(s, "b", { type: "fold" });
    expect(s.stack).toHaveLength(0);
    expect(s.props[1]).toBeUndefined();
  });

  it("bids are cash-capped; leader cannot fold", () => {
    const s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    const s2 = step(s, "a", { type: "decline" });
    expect(apply(s2, "b", { type: "bid", amount: 99999 }).ok).toBe(false);
    const s3 = step(s2, "b", { type: "bid", amount: 30 });
    expect(apply(s3, "b", { type: "fold" }).ok).toBe(false);
  });

  it("no trading during an auction", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    s = step(s, "a", { type: "decline" });
    const r = apply(s, "a", { type: "proposeTrade", to: "b", give: { cash: 10, props: [], jailCards: 0 }, get: { cash: 0, props: [], jailCards: 0 } });
    expect(r.ok).toBe(false);
  });
});
