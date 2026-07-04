import { expect } from "vitest";
import type { GameState } from "../src/types";

// Called after every apply in tests. Catches frame leaks and cross-domain corruption instantly.
export function checkInvariants(s: GameState): void {
  // no negative cash, ever
  for (const p of s.players) expect(p.cash, `${p.name} cash`).toBeGreaterThanOrEqual(0);
  // building stock conserved
  const onBoard = Object.values(s.props).reduce(
    (acc, o) => ({ houses: acc.houses + (o!.houses === 5 ? 0 : o!.houses), hotels: acc.hotels + (o!.houses === 5 ? 1 : 0) }),
    { houses: 0, hotels: 0 },
  );
  expect(onBoard.houses + s.bank.houses, "house stock").toBe(32);
  expect(onBoard.hotels + s.bank.hotels, "hotel stock").toBe(12);
  // frames reference alive players
  for (const f of s.stack) {
    if (f.t === "debt") expect(s.players.find((p) => p.id === f.debtor)?.bankrupt, "debtor alive").toBe(false);
    if (f.t === "auction") for (const pid of f.active) expect(s.players.find((p) => p.id === pid)?.bankrupt, "bidder alive").toBe(false);
  }
  // props owned by alive players
  for (const o of Object.values(s.props)) expect(s.players.find((p) => p.id === o!.owner)?.bankrupt, "prop owner alive").toBe(false);
  // current player alive while playing
  if (s.status === "playing") expect(s.players[s.current].bankrupt).toBe(false);
}
