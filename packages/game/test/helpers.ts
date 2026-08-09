import type { GameState } from "../src/types";
import { addPlayer, createGame } from "../src/setup";
import { apply } from "../src/engine";

// A started 2-player game in preRoll, current = player "a". Deterministic seed.
export function started(seed = 12345): GameState {
  const s = createGame(seed);
  s.settings.randomOrder = false; // tests rely on a,b order
  addPlayer(s, "a", "Alice");
  addPlayer(s, "b", "Bob");
  const r = apply(s, "a", { type: "start" });
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
