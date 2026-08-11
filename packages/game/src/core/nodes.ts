import type { GameNode, GameState } from "../types";

// Dove la macchina sta aspettando, e chi ha il diritto di parlare adesso.

/** Il nodo attivo: l'interrupt in cima allo stack, altrimenti la fase di turno.
 *  Accetta qualunque stato che porti phase+stack, quindi il client lo chiama sul PublicState. */
export const activeNode = (s: Pick<GameState, "phase" | "stack">): GameNode => s.stack.at(-1) ?? s.phase;
