import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { advance } from "../src/board";
import { addPlayer, createGame } from "../src/setup";
import { started } from "./helpers";
import type { GameState, Player } from "../src/types";

describe("lobby", () => {
  it("needs 2+ players to start", () => {
    const s = createGame(1);
    addPlayer(s, "a", "Alice");
    expect(apply(s, "a", { type: "start" }).ok).toBe(false);
  });

  it("starts into preRoll for player 0", () => {
    const s = started();
    expect(s.status).toBe("playing");
    expect(s.phase.t).toBe("preRoll");
    expect(s.current).toBe(0);
  });
});

describe("roll -> postRoll", () => {
  it("moves the current player and advances rng", () => {
    const s = started();
    const before = s.players[0].pos;
    const r = apply(s, "a", { type: "roll" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.seed).not.toBe(s.seed); // dice consumed rng
    const moved = (r.state.players[0].pos - before + 40) % 40;
    expect(moved).toBeGreaterThanOrEqual(2);
    expect(moved).toBeLessThanOrEqual(12);
    // postRoll normally; buyPrompt if we landed on an unowned property; preRoll never (jail = postRoll)
    expect(["postRoll", "buyPrompt"]).toContain(r.state.phase.t);
    expect(r.events[0].e).toBe("rolled");
  });

  it("rejects a roll from the wrong player", () => {
    const s = started();
    expect(apply(s, "b", { type: "roll" }).ok).toBe(false);
  });

  it("endTurn passes to the next player (no doubles)", () => {
    let s = started();
    // roll until we get a non-doubles turn, then endTurn should advance current
    const r = apply(s, "a", { type: "roll" });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    if (s.phase.t === "postRoll" && !s.phase.again) {
      const e = apply(s, "a", { type: "endTurn" });
      expect(e.ok).toBe(true);
      if (e.ok) expect(e.state.current).toBe(1);
    }
  });
});

describe("GO salary (advance unit)", () => {
  it("pays 200 when passing GO", () => {
    const s = createGame(1) as GameState;
    const p: Player = {
      id: "a",
      name: "A",
      token: 0,
      cash: 1500,
      pos: 39,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      doublesCount: 0,
      bankrupt: false,
      connected: true,
    };
    advance(s, p, 3); // 39 -> 2, wraps past GO
    expect(p.pos).toBe(2);
    expect(p.cash).toBe(1700);
  });

  it("does not pay when not passing GO", () => {
    const s = createGame(1);
    const p: Player = {
      id: "a",
      name: "A",
      token: 0,
      cash: 1500,
      pos: 5,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      doublesCount: 0,
      bankrupt: false,
      connected: true,
    };
    advance(s, p, 4); // 5 -> 9
    expect(p.pos).toBe(9);
    expect(p.cash).toBe(1500);
  });
});
