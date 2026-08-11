import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { addPlayer, createGame } from "../src/setup";
import { inOrdine, started } from "./helpers";
import { checkInvariants } from "./invariants";
import type { GameState } from "../src/types";

function trio(): GameState {
  const g = createGame(7);
  addPlayer(g, "a", "A");
  addPlayer(g, "b", "B");
  addPlayer(g, "c", "C");
  const r = apply(g, "a", { type: "start" });
  if (!r.ok) throw new Error(r.error);
  return inOrdine(r.state);
}

function step(s: GameState, pid: string, target: string): GameState {
  const r = apply(s, pid, { type: "votekick", target });
  if (!r.ok) throw new Error(r.error);
  checkInvariants(r.state);
  return r.state;
}

describe("votekick", () => {
  it("kicks on unanimity of the others; estate falls to the bank and re-auctions", () => {
    let s = trio();
    s.props[1] = { owner: "c", mortgaged: false, houses: 0 };
    s.players[2].connected = false;

    s = step(s, "a", "c"); // 1/2: pending
    expect(s.players[2].bankrupt).toBe(false);
    expect(s.kickVotes["c"]).toEqual(["a"]);

    s = step(s, "b", "c"); // 2/2: kicked
    expect(s.players[2].bankrupt).toBe(true);
    expect(s.props[1]).toBeUndefined();
    expect(s.stack[0]?.t).toBe("auction"); // estate re-auction chain
    expect(s.kickVotes["c"]).toBeUndefined(); // votes cleaned up
  });

  it("no self-kick; no 1v1 kick of a connected player; 1v1 ok if they left", () => {
    const s = started();
    expect(apply(s, "a", { type: "votekick", target: "a" }).ok).toBe(false);
    expect(apply(s, "a", { type: "votekick", target: "b" }).ok).toBe(false);
    s.players[1].connected = false;
    const r = apply(s, "a", { type: "votekick", target: "b" });
    expect(r.ok && r.state.status).toBe("ended");
  });

  it("kicking the debtor voids their debt frame", () => {
    let s = trio();
    s.players[2].connected = false;
    s.stack.push({ t: "debt", debtor: "c", claims: [{ creditor: "bank", amount: 100 }] });
    s = step(s, "a", "c");
    s = step(s, "b", "c");
    expect(s.players[2].bankrupt).toBe(true);
    expect(s.stack.some((f) => f.t === "debt")).toBe(false);
  });

  it("blocked while an auction runs", () => {
    const s = trio();
    s.stack.push({ t: "auction", tile: 1, queue: [], bid: 5, leader: "c", active: ["a", "b", "c"], bids: [{ pid: "c", amount: 5 }] });
    expect(apply(s, "a", { type: "votekick", target: "c" }).ok).toBe(false);
  });
});
