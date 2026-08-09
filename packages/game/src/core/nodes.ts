import type { GameNode, GameState, PlayerId } from "../types";

// Dove la macchina sta aspettando, e chi ha il diritto di parlare adesso.

/** Il nodo attivo: l'interrupt in cima allo stack, altrimenti la fase di turno.
 *  Accetta qualunque stato che porti phase+stack, quindi il client lo chiama sul PublicState. */
export const activeNode = (s: Pick<GameState, "phase" | "stack">): GameNode => s.stack.at(-1) ?? s.phase;

/** Chi può fare cassa adesso: chi ha il turno, chi ha un debito aperto, chi è ancora
 *  in gara in un'asta (offrire oltre i propri contanti è vietato: senza questo chi
 *  resta corto non avrebbe mosse). Usata dal gate e da legalActions: una sola fonte. */
export function canRaiseCash(s: Pick<GameState, "players" | "current" | "stack">, pid: PlayerId): boolean {
  if (s.players[s.current]?.id === pid) return true;
  const top = s.stack.at(-1);
  if (top?.t === "debt" && top.debtor === pid) return true;
  return top?.t === "auction" && top.active.includes(pid);
}
