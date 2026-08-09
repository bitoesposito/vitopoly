import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { rentFor } from "../src/rules/rent";
import { build, whyNotBuild, whyNotMortgage, whyNotSellProperty, whyNotUnmortgage, sellHouse } from "../src/rules/property";
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
  it("serve il gruppo intero, e non ipotecato", () => {
    const s = started();
    s.players[0].cash = 10000;
    s.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    expect(build(s, "a", 1)).toBe("serve l'intero gruppo di colore");
    ownGroup(s, [1, 3], "a");
    expect(build(s, "a", 1)).toBeNull();
    s.props[3]!.mortgaged = true;
    expect(build(s, "a", 1)).toBe("il gruppo ha strade ipotecate");
    s.props[3]!.mortgaged = false;
    // si può caricare una strada sola: la casa del regolamento non impone uniformità
    expect(build(s, "a", 1)).toBeNull();
    expect(s.props[1]!.houses).toBe(2);
    expect(s.props[3]!.houses).toBe(0);
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

  it("sellProperty: deed back to the bank at mortgage + 25%", () => {
    const s = started();
    s.props[6] = { owner: "a", mortgaged: false, houses: 0 };
    const r = apply(s, "a", { type: "sellProperty", tile: 6 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.props[6]).toBeUndefined();
    expect(r.state.players[0].cash).toBe(1500 + 63); // price 100 -> 50 * 1.25
    // già ipotecata: metà prezzo l'ha già incassata, resta il solo plusvalore
    const m = started();
    m.props[6] = { owner: "a", mortgaged: true, houses: 0 };
    const rm = apply(m, "a", { type: "sellProperty", tile: 6 });
    expect(rm.ok).toBe(true);
    if (!rm.ok) return;
    expect(rm.state.props[6]).toBeUndefined();
    expect(rm.state.players[0].cash).toBe(1500 + 13); // 50 * 0.25; 50 + 13 = 63, come la vendita piena
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

describe("predicati delle regole (usati anche dalla UI)", () => {
  it("costruire richiede il set completo, e il motivo è lo stesso che vede il client", () => {
    const s = started();
    s.players[0].cash = 10000;
    s.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    // Foggia senza Trani: niente set
    expect(whyNotBuild(s, "a", 1)).toBe("serve l'intero gruppo di colore");
    expect(build(s, "a", 1)).toBe("serve l'intero gruppo di colore"); // motore e predicato d'accordo
    ownGroup(s, [1, 3], "a");
    expect(whyNotBuild(s, "a", 1)).toBeNull();
  });

  it("i predicati coprono i casi in cui il bottone non deve essere premibile", () => {
    const s = started();
    s.players[0].cash = 10000;
    ownGroup(s, [1, 3], "a");
    // ipotecata: non ci si costruisce
    s.props[1]!.mortgaged = true;
    expect(whyNotBuild(s, "a", 1)).toBe("è ipotecata");
    s.props[1]!.mortgaged = false;
    // senza contanti
    s.players[0].cash = 0;
    expect(whyNotBuild(s, "a", 1)).toBe("non te lo puoi permettere");
    s.players[0].cash = 10000;
    // banca a secco
    s.bank.houses = 0;
    expect(whyNotBuild(s, "a", 1)).toBe("la banca ha finito le case");
    s.bank.houses = 32;
    // con edifici sul gruppo non si ipoteca né si svende
    expect(build(s, "a", 1)).toBeNull();
    expect(whyNotMortgage(s, "a", 3)).toBe("il gruppo ha edifici");
    expect(whyNotSellProperty(s, "a", 3)).toBe("il gruppo ha edifici");
    // riscatto senza soldi
    s.props[6] = { owner: "a", mortgaged: true, houses: 0 };
    s.players[0].cash = 0;
    expect(whyNotUnmortgage(s, "a", 6)).toBe("non te lo puoi permettere");
  });
});
