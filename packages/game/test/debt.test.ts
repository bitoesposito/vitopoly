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

// Hand-written mid-game state: "a" owes rent it cannot pay.
function inDebt(amount: number): GameState {
  const s = started();
  s.phase = { t: "postRoll", again: false };
  s.props[1] = { owner: "a", mortgaged: false, houses: 0 }; // Mediterranean, mortgage value 30
  s.players[0].cash = 10;
  s.stack.push({ t: "debt", debtor: "a", claims: [{ creditor: "b", amount }] });
  return s;
}

describe("debt resolution", () => {
  it("mortgage raises cash, payDebt settles and pops", () => {
    let s = inDebt(35);
    expect(apply(s, "a", { type: "payDebt" }).ok).toBe(false); // 10 < 35
    s = step(s, "a", { type: "mortgage", tile: 1 }); // +30 -> 40
    s = step(s, "a", { type: "payDebt" });
    expect(s.stack).toHaveLength(0);
    expect(s.players[0].cash).toBe(5);
    expect(s.players[1].cash).toBe(1535);
    expect(s.phase).toEqual({ t: "postRoll", again: false }); // resumed
  });

  it("multi-claim queue pays what it can, keeps the rest", () => {
    const s = started();
    s.phase = { t: "postRoll", again: false };
    s.players[0].cash = 60;
    s.stack.push({ t: "debt", debtor: "a", claims: [{ creditor: "b", amount: 50 }, { creditor: "bank", amount: 100 }] });
    const r = apply(s, "a", { type: "payDebt" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.stack).toHaveLength(1); // bank claim remains
    expect((r.state.stack[0] as { claims: unknown[] }).claims).toHaveLength(1);
    expect(r.state.players[0].cash).toBe(10);
  });

  it("bankrupt to a player: estate transfers, player eliminated, game ends at 1 survivor", () => {
    let s = inDebt(9999);
    s = step(s, "a", { type: "bankrupt" });
    expect(s.players[0].bankrupt).toBe(true);
    expect(s.props[1]?.owner).toBe("b"); // estate transferred
    expect(s.players[1].cash).toBe(1510); // + debtor's 10 cash
    expect(s.status).toBe("ended"); // 2-player game -> winner
    expect(s.winner).toBe("b");
  });

  it("bankrupt to the bank: estate auctioned, next player frozen until it drains", () => {
    const s = started();
    // add a third player so the game continues after the bankruptcy
    s.players.push({ ...s.players[0], id: "c", name: "Cleo", token: 2, cash: 1500 });
    s.phase = { t: "postRoll", again: false };
    s.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    s.props[3] = { owner: "a", mortgaged: false, houses: 0 };
    s.players[0].cash = 0;
    s.stack.push({ t: "debt", debtor: "a", claims: [{ creditor: "bank", amount: 500 }] });

    let s2 = step(s, "a", { type: "bankrupt" });
    expect(s2.players[0].bankrupt).toBe(true);
    expect(s2.props[1]).toBeUndefined(); // returned to bank
    expect(s2.stack[0]?.t).toBe("auction"); // first estate auction live
    expect(s2.phase).toEqual({ t: "preRoll" }); // next player's turn set UNDER the auction
    expect(apply(s2, "b", { type: "roll" }).ok).toBe(false); // but still frozen by the auction

    // drain both auctions: b wins the first, everyone folds the second
    s2 = step(s2, "b", { type: "bid", amount: 20 });
    s2 = step(s2, "c", { type: "fold" });
    expect(s2.stack[0]?.t).toBe("auction"); // chained second auction
    s2 = step(s2, "b", { type: "fold" });
    s2 = step(s2, "c", { type: "fold" });
    expect(s2.stack).toHaveLength(0);
    expect(s2.props[1]?.owner).toBe("b");
    expect(apply(s2, "b", { type: "roll" }).ok).toBe(true); // unfrozen
  });

  it("buildings liquidate to the bank at half price before bankruptcy", () => {
    const s = started();
    s.phase = { t: "postRoll", again: false };
    s.props[1] = { owner: "a", mortgaged: false, houses: 2 };
    s.props[3] = { owner: "a", mortgaged: false, houses: 2 };
    s.bank.houses = 28;
    s.players[0].cash = 0;
    s.stack.push({ t: "debt", debtor: "a", claims: [{ creditor: "b", amount: 9999 }] });
    const s2 = step(s, "a", { type: "bankrupt" });
    expect(s2.bank.houses).toBe(32); // houses back
    expect(s2.players[1].cash).toBe(1500 + 100); // 4 houses * 50/2 went debtor -> creditor
  });
});
