import type { GameState, Player, PlayerId } from "../types";

// Accessi al roster. Nessuna regola qui: solo "chi è chi" e il passaggio del turno.

export const cur = (s: GameState): Player => s.players[s.current];
export const byId = (s: GameState, pid: PlayerId): Player => s.players.find((p) => p.id === pid)!;
export const alive = (s: GameState): Player[] => s.players.filter((p) => !p.bankrupt);
export const cash = (s: GameState, pid: PlayerId): number => byId(s, pid).cash;

/** Passa il turno al prossimo non fallito e riparte da un preRoll pulito.
 *  Presuppone almeno 2 superstiti: la condizione di vittoria la controlla il chiamante. */
export function nextPlayer(s: GameState): void {
  do {
    s.current = (s.current + 1) % s.players.length;
  } while (s.players[s.current].bankrupt);
  s.players[s.current].doublesCount = 0;
  s.phase = { t: "preRoll" };
}
