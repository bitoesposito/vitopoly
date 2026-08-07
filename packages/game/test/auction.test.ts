import { describe, expect, it } from "vitest";
import { apply, auctionTimeout } from "../src/engine";
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

    s = step(s, "b", { type: "bid", amount: 30 }); // increments: 0 -> 30
    s = step(s, "a", { type: "bid", amount: 10 }); // decliner can bid too: 30 -> 40
    s = step(s, "b", { type: "fold" });

    expect(s.stack).toHaveLength(0); // settled, popped
    expect(s.props[1]?.owner).toBe("a");
    expect(s.players[0].cash).toBe(1460);
    expect(s.phase).toEqual({ t: "postRoll", again: false }); // frozen phase resumed
  });

  it("timer expiry settles to the leader; the bid log records running totals", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    s = step(s, "a", { type: "decline" });
    s = step(s, "b", { type: "bid", amount: 2 });
    s = step(s, "a", { type: "bid", amount: 10 });
    const f = s.stack[0];
    if (f.t !== "auction") throw new Error("expected auction");
    expect(f.bids).toEqual([{ pid: "b", amount: 2 }, { pid: "a", amount: 12 }]);

    const r = auctionTimeout(s);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    checkInvariants(s);
    expect(s.stack).toHaveLength(0);
    expect(s.props[1]?.owner).toBe("a");
    expect(s.players[0].cash).toBe(1488);
  });

  it("timer expiry with no bids leaves the property unowned", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    s = step(s, "a", { type: "decline" });
    const r = auctionTimeout(s);
    if (!r.ok) throw new Error(r.error);
    expect(r.state.stack).toHaveLength(0);
    expect(r.state.props[1]).toBeUndefined();
  });

  it("the leader cannot raise their own bid", () => {
    let s = started();
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    s = step(s, "a", { type: "decline" });
    s = step(s, "b", { type: "bid", amount: 2 });
    expect(apply(s, "b", { type: "bid", amount: 2 }).ok).toBe(false);
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
    expect(apply(s2, "b", { type: "bid", amount: 99999 }).ok).toBe(false); // 0 + 99999 > cash
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

describe("fare cassa durante l'asta", () => {
  it("chi è ancora in gara può ipotecare anche se non è il suo turno", () => {
    const s = started();
    s.props[6] = { owner: "b", mortgaged: false, houses: 0 };
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    const d = apply(s, "a", { type: "decline" }); // parte l'asta
    if (!d.ok) throw new Error(d.error);
    expect(d.state.stack.at(-1)?.t).toBe("auction");
    expect(d.state.players[d.state.current].id).toBe("a"); // non è il turno di b
    const m = apply(d.state, "b", { type: "mortgage", tile: 6 });
    expect(m.ok).toBe(true);
    if (m.ok) expect(m.state.props[6]!.mortgaged).toBe(true);
  });

  it("chi si è ritirato dall'asta non può più fare cassa fuori turno", () => {
    const s = started();
    s.props[6] = { owner: "b", mortgaged: false, houses: 0 };
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    const d = apply(s, "a", { type: "decline" });
    if (!d.ok) throw new Error(d.error);
    const f = apply(d.state, "b", { type: "fold" });
    if (!f.ok) throw new Error(f.error);
    // se l'asta è ancora aperta, b è fuori e non può più smontare il patrimonio
    if (f.state.stack.at(-1)?.t === "auction") {
      expect(apply(f.state, "b", { type: "mortgage", tile: 6 }).ok).toBe(false);
    }
  });
});
