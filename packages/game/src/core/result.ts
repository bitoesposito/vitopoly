import type { ClientAction, GameEvent, GameState, PlayerId, Result } from "../types";

// Il vocabolario comune di ogni handler: si clona lo stato, si muta la copia, si
// restituisce ok/err. Nessun handler muta `state` in ingresso.

export const clone = (s: GameState): GameState => structuredClone(s);
export const ok = (state: GameState, events: GameEvent[] = []): Result => ({ ok: true, state, events });
export const err = (error: string): Result => ({ ok: false, error });
export const info = (text: string): GameEvent => ({ e: "info", text });

export type Handler = (s: GameState, pid: PlayerId, a: ClientAction) => Result;
