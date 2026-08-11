// Il gioco non ha audio: il motorino è l'unico canale non visivo. È un rinforzo, mai
// l'unico segnale — `vibrate` non esiste su iOS e alcuni browser la ignorano finché la
// pagina non riceve un tocco, quindi ogni cosa che vibra si vede anche a schermo.

/** Il tocco è stato registrato (conferma a due tempi). */
export const TICK = 10;
/** Tocca a te, o qualcuno ti ha superato: alza la testa. */
export const NUDGE = 25;
/** Ti sta bloccando la partita: un debito da saldare. */
export const KNOCK = [0, 30, 60, 30];
/** Due dadi che si posano. */
export const DICE = [8, 40, 8];

export function buzz(pattern: number | number[]): void {
  // ponytail: prefers-reduced-motion è un proxy (chi chiede meno movimento chiede meno
  // stimoli); al suo posto va un interruttore utente.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate?.(pattern);
}
