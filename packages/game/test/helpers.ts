import type { GameState } from "../src/types";
import { addPlayer, createGame } from "../src/setup";
import { apply } from "../src/engine";

// A started 2-player game in preRoll, current = player "a". Deterministic seed.
export function started(seed = 12345): GameState {
  const s = createGame(seed);
  addPlayer(s, "a", "Alice");
  addPlayer(s, "b", "Bob");
  const r = apply(s, "a", { type: "start" });
  if (!r.ok) throw new Error(r.error);
  return inOrdine(r.state);
}

/** L'ordine di turno è sorteggiato: chi asserisce su "a" e "b" lo rimette in fila. Prima era
 *  un flag del regolamento, cioè una regola che esisteva per i test. */
export function inOrdine(s: GameState): GameState {
  s.players.sort((x, y) => x.id.localeCompare(y.id));
  s.current = 0;
  return s;
}
