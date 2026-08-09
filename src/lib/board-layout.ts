// Geometria e tempi della plancia: dove sta una casella, e quanto ci mette una pedina
// ad arrivarci. Condivisi da Board, Tokens e dalla coreografia degli eventi.

/** Indice casella 0..39 -> cella della griglia 11x11, VIA in alto a sinistra. */
export function tileCell(i: number): { row: number; col: number } {
  if (i <= 10) return { row: 1, col: 1 + i };
  if (i <= 20) return { row: 1 + (i - 10), col: 11 };
  if (i <= 30) return { row: 11, col: 11 - (i - 20) };
  return { row: 11 - (i - 30), col: 1 };
}

/** Durata della camminata per n caselle: ~300ms per un salto corto, con un tetto. */
export const walkMs = (steps: number) => Math.min(300 + steps * 45, 800);
