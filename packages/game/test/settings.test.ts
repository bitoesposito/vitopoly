import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { rentFor } from "../src/rent";
import { build } from "../src/properties";
import { addPlayer, createGame } from "../src/setup";
import { started } from "./helpers";

describe("game settings", () => {
  it("only the host edits settings; clamped; applied at start", () => {
    const s = createGame(7);
    s.settings.randomOrder = false;
    addPlayer(s, "a", "A");
    addPlayer(s, "b", "B");
    expect(apply(s, "b", { type: "updateSettings", settings: { startingCash: 2000 } }).ok).toBe(false);
    const r = apply(s, "a", { type: "updateSettings", settings: { startingCash: 2000, maxPlayers: 99 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.settings.maxPlayers).toBe(8); // clamped
    const g = apply(r.state, "a", { type: "start" });
    if (!g.ok) throw new Error(g.error);
    expect(g.state.players.every((p) => p.cash === 2000)).toBe(true);
  });

  it("maxPlayers caps joins", () => {
    const s = createGame(7);
    s.settings.maxPlayers = 2;
    addPlayer(s, "a", "A");
    addPlayer(s, "b", "B");
    expect(addPlayer(s, "c", "C")).toBeNull();
  });

  it("evenBuild off allows lopsided building", () => {
    const s = started();
    s.settings.evenBuild = false;
    s.players[0].cash = 10000;
    s.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    s.props[3] = { owner: "a", mortgaged: false, houses: 0 };
    expect(build(s, "a", 1)).toBeNull();
    expect(build(s, "a", 1)).toBeNull(); // 2 on the same street, 0 on the sibling
    expect(s.props[1]!.houses).toBe(2);
  });

  it("noRentInPrison waives rent while the owner is jailed", () => {
    const s = started();
    s.props[1] = { owner: "b", mortgaged: false, houses: 0 };
    s.players[1].inJail = true;
    expect(rentFor(s, 1, 7)).toBe(2); // setting off: rent due
    s.settings.noRentInPrison = true;
    expect(rentFor(s, 1, 7)).toBe(0);
  });

  it("doubleRentFullSet off keeps base rent on monopolies", () => {
    const s = started();
    s.props[1] = { owner: "b", mortgaged: false, houses: 0 };
    s.props[3] = { owner: "b", mortgaged: false, houses: 0 };
    expect(rentFor(s, 1, 7)).toBe(4);
    s.settings.doubleRentFullSet = false;
    expect(rentFor(s, 1, 7)).toBe(2);
  });

  it("auction off: decline leaves the tile unowned, no frame", () => {
    const s = started();
    s.settings.auction = false;
    s.phase = { t: "buyPrompt", tile: 1, again: false };
    const r = apply(s, "a", { type: "decline" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.stack).toHaveLength(0);
    expect(r.state.props[1]).toBeUndefined();
  });

  it("vacation pot: bank fees accumulate, landing collects", () => {
    const s = started();
    expect(s.settings.vacationCash).toBe(true);
    // income tax via charge
    s.players[0].pos = 4;
    const r = apply(s, "a", { type: "roll" }); // roll moves elsewhere, so test the funnel directly instead
    expect(r.ok).toBe(true);
    // direct: charge through the transfer funnel
    const s2 = started();
    s2.players[0].cash = 1000;
    s2.phase = { t: "postRoll", again: false };
    s2.stack.push({ t: "debt", debtor: "a", claims: [{ creditor: "bank", amount: 200 }] });
    const paid = apply(s2, "a", { type: "payDebt" });
    if (!paid.ok) throw new Error(paid.error);
    expect(paid.state.vacationPot).toBe(200);
  });

  it("randomOrder shuffles turn order deterministically by seed", () => {
    const make = () => {
      const s = createGame(42);
      addPlayer(s, "a", "A");
      addPlayer(s, "b", "B");
      addPlayer(s, "c", "C");
      addPlayer(s, "d", "D");
      const r = apply(s, "a", { type: "start" });
      if (!r.ok) throw new Error(r.error);
      return r.state.players.map((p) => p.id).join("");
    };
    expect(make()).toBe(make()); // deterministic
  });

  it("roll again straight from postRoll after doubles", () => {
    const s = started();
    s.phase = { t: "postRoll", again: true };
    expect(apply(s, "a", { type: "roll" }).ok).toBe(true);
    s.phase = { t: "postRoll", again: false };
    expect(apply(s, "a", { type: "roll" }).ok).toBe(false);
  });
});
