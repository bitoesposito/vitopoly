import { expect } from "vitest";
import { violazioni } from "../src/invariants";
import type { GameState } from "../src/types";

// Chiamata dopo ogni apply nei test. Le regole stanno in src/invariants.ts: sono le
// stesse che il server controlla prima di persistere.
export function checkInvariants(s: GameState): void {
  expect(violazioni(s)).toEqual([]);
}
