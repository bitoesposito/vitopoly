import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { rentFor } from "../src/rent";
import { build, sellHouse } from "../src/properties";
import { started } from "./helpers";
import type { GameState } from "../src/types";

function ownGroup(s: GameState, tiles: number[], owner: string) {
  for (const t of tiles) s.props[t] = { owner, mortgaged: false, houses: 0 };
}

describe("rent math", () => {
  it("base / monopoly double / houses", () => {
    const s = started();
    s.props[1] = { owner: "b", mortgaged: false, houses: 0 };
    expect(rentFor(s, 1, 7)).toBe(2); // base
    ownGroup(s, [1, 3], "b");
    expect(rentFor(s, 1, 7)).toBe(4); // full group -> double
    s.props[1]!.houses = 3;
    expect(rentFor(s, 1, 7)).toBe(90); // house table
    s.props[1]!.mortgaged = true;
    expect(rentFor(s, 1, 7)).toBe(0); // mortgaged
  });

  it("railroads scale by count, utilities by dice", () => {
    const s = started();
    s.props[5] = { owner: "b", mortgaged: false, houses: 0 };
    expect(rentFor(s, 5, 7)).toBe(25);
    s.props[15] = { owner: "b", mortgaged: false, houses: 0 };
    s.props[25] = { owner: "b", mortgaged: false, houses: 0 };
    expect(rentFor(s, 5, 7)).toBe(100); // 3 railroads
    s.props[12] = { owner: "b", mortgaged: false, houses: 0 };
    expect(rentFor(s, 12, 7)).toBe(28); // one utility: 4 x dice
    s.props[28] = { owner: "b", mortgaged: false, houses: 0 };
    expect(rentFor(s, 12, 7)).toBe(70); // both: 10 x dice
  });
});

describe("building", () => {
  it("requires full unmortgaged group and even-build order", () => {
    const s = started();
    s.players[0].cash = 10000;
    s.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    expect(build(s, "a", 1)).toBe("need the full color group");
    ownGroup(s, [1, 3], "a");
    expect(build(s, "a", 1)).toBeNull(); // 1 -> house 1
    expect(build(s, "a", 1)).toBe("build evenly"); // must build on 3 first
    expect(build(s, "a", 3)).toBeNull();
    expect(s.bank.houses).toBe(30);
  });

  it("hotel: 4 houses -> hotel returns 4 to bank; shortage sells the whole block", () => {
    const s = started();
    s.players[0].cash = 10000;
    ownGroup(s, [1, 3], "a");
    s.props[1]!.houses = 4;
    s.props[3]!.houses = 4;
    s.bank.houses = 24;
    expect(build(s, "a", 1)).toBeNull(); // hotel
    expect(s.props[1]!.houses).toBe(5);
    expect(s.bank.houses).toBe(28);
    expect(s.bank.hotels).toBe(11);
    // shortage: bank has 0 houses -> selling the hotel sells the whole block
    s.bank.houses = 0;
    expect(sellHouse(s, "a", 1)).toBeNull();
    expect(s.props[1]!.houses).toBe(0);
    expect(s.bank.hotels).toBe(12);
  });
});

describe("asset actions: own turn only", () => {
  it("build is legal on your own preRoll, before rolling", () => {
    const s = started();
    s.players[0].cash = 10000;
    ownGroup(s, [1, 3], "a");
    expect(s.phase.t).toBe("preRoll");
    const r = apply(s, "a", { type: "build", tile: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.props[1]!.houses).toBe(1);
  });

  it("cash raisers are rejected off-turn, allowed for an off-turn debtor", () => {
    const s = started();
    s.props[6] = { owner: "b", mortgaged: false, houses: 0 };
    expect(apply(s, "b", { type: "mortgage", tile: 6 }).ok).toBe(false); // a's turn
    expect(apply(s, "b", { type: "sellProperty", tile: 6 }).ok).toBe(false);
    // b owes (e.g. a "pay each player" card) -> b may raise cash even off-turn
    s.stack.push({ t: "debt", debtor: "b", claims: [{ creditor: "a", amount: 500 }] });
    expect(apply(s, "b", { type: "mortgage", tile: 6 }).ok).toBe(true);
  });

  it("sellProperty: deed back to the bank at half price", () => {
    const s = started();
    s.props[6] = { owner: "a", mortgaged: false, houses: 0 };
    const r = apply(s, "a", { type: "sellProperty", tile: 6 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.props[6]).toBeUndefined();
    expect(r.state.players[0].cash).toBe(1500 + 50); // price 100 / 2
    // mortgaged deeds have nothing left to sell
    const m = started();
    m.props[6] = { owner: "a", mortgaged: true, houses: 0 };
    expect(apply(m, "a", { type: "sellProperty", tile: 6 }).ok).toBe(false);
  });
});

describe("jail", () => {
  it("payBail frees and lets you roll", () => {
    let s = started();
    s.players[0].inJail = true;
    s.players[0].jailTurns = 1;
    const r = apply(s, "a", { type: "payBail" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.players[0].inJail).toBe(false);
    expect(s.players[0].cash).toBe(1450);
    expect(s.phase.t).toBe("preRoll"); // still your roll
  });

  it("useJailCard consumes a card", () => {
    const s = started();
    s.players[0].inJail = true;
    s.players[0].jailCards = 1;
    const r = apply(s, "a", { type: "useJailCard" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players[0].inJail).toBe(false);
    expect(r.state.players[0].jailCards).toBe(0);
  });

  it("failed roll stays in jail; 3rd forces bail AFTER moving", () => {
    // hunt a seed whose first roll is not doubles
    for (let seed = 1; seed < 100; seed++) {
      let s = started(seed);
      s.players[0].inJail = true;
      s.players[0].jailTurns = 2; // this is the 3rd attempt
      s.players[0].pos = 10;
      const r = apply(s, "a", { type: "roll" });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      s = r.state;
      const ev0 = r.events[0];
      if (ev0.e === "rolled" && ev0.d1 === ev0.d2) continue; // doubles: freed for free, not the case under test
      expect(s.players[0].inJail).toBe(false);
      expect(s.players[0].pos).not.toBe(10); // MOVED first
      // bail was charged (cash reduced or debt frame present)
      const paidBail = r.events.some((e) => e.e === "paid" && e.why === "bail");
      const debt = s.stack.some((f) => f.t === "debt");
      expect(paidBail || debt).toBe(true);
      return;
    }
    throw new Error("no non-doubles seed found");
  });
});

describe("trades", () => {
  it("propose + accept swaps assets atomically", () => {
    const s = started();
    s.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    const p = apply(s, "a", {
      type: "proposeTrade",
      to: "b",
      give: { cash: 0, props: [1], jailCards: 0 },
      get: { cash: 100, props: [], jailCards: 0 },
    });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const id = p.state.trades[0].id;
    const r = apply(p.state, "b", { type: "respondTrade", id, accept: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.props[1]?.owner).toBe("b");
    expect(r.state.players[0].cash).toBe(1600);
    expect(r.state.players[1].cash).toBe(1400);
    expect(r.state.trades).toHaveLength(0);
  });

  it("accept re-validates: stale trade is dropped, not executed", () => {
    const s = started();
    s.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    const p = apply(s, "a", {
      type: "proposeTrade",
      to: "b",
      give: { cash: 0, props: [1], jailCards: 0 },
      get: { cash: 0, props: [], jailCards: 0 },
    });
    if (!p.ok) throw new Error(p.error);
    p.state.props[1]!.owner = "b"; // asset changed since proposal
    const r = apply(p.state, "b", { type: "respondTrade", id: p.state.trades[0].id, accept: true });
    expect(r.ok).toBe(true); // drop persists
    if (!r.ok) return;
    expect(r.state.trades).toHaveLength(0);
    expect(r.state.players[0].cash).toBe(1500); // nothing executed
  });
});
