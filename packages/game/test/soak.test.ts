import { describe, expect, it } from "vitest";
import { apply, legalActions } from "../src/engine";
import { addPlayer, createGame } from "../src/setup";
import { checkInvariants } from "./invariants";
import { nextInt } from "../src/rng";
import type { ClientAction, GameState } from "../src/types";

// 2000 random-but-legal actions with invariants after every step.
// The cheapest cross-domain corruption detector: catches frame leaks no scripted test imagines.

function randomAction(s: GameState, rng: { seed: number }): { pid: string; a: ClientAction } {
  const players = s.players.filter((p) => !p.bankrupt);
  const pid = players[nextInt(rng, players.length)].id;
  const types = legalActions(s, pid);
  const type = types[nextInt(rng, types.length)];
  const tile = nextInt(rng, 40);
  switch (type) {
    case "bid":
      return { pid, a: { type, amount: 1 + nextInt(rng, 200) } };
    case "build":
    case "sellHouse":
    case "mortgage":
    case "unmortgage":
      return { pid, a: { type, tile } };
    default:
      return { pid, a: { type } as ClientAction };
  }
}

describe("soak", () => {
  it("2000 random legal-ish actions never corrupt the state", () => {
    const rng = { seed: 424242 };
    const s0 = createGame(99);
    addPlayer(s0, "a", "A");
    addPlayer(s0, "b", "B");
    addPlayer(s0, "c", "C");
    addPlayer(s0, "d", "D");
    const start = apply(s0, "a", { type: "start" });
    if (!start.ok) throw new Error(start.error);
    let s = start.state;

    let applied = 0;
    let rejected = 0;
    for (let i = 0; i < 2000 && s.status === "playing"; i++) {
      const { pid, a } = randomAction(s, rng);
      const r = apply(s, pid, a);
      if (r.ok) {
        checkInvariants(r.state);
        s = r.state;
        applied++;
      } else {
        rejected++;
      }
    }
    // sanity: the game actually progressed (a finished game is maximal progress).
    // Threshold is low on purpose: the pool now includes always-legal actions with
    // random tiles, so most picks reject — a real deadlock would sit near zero.
    expect(s.status === "ended" || applied > 50).toBe(true);
    expect(applied + rejected).toBeGreaterThan(0);
  });
});
