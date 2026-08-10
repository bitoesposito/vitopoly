// Il gioco non ha audio: l'unico canale non visivo che il telefono offre è il motorino.
// È un rinforzo, mai l'unico segnale — `vibrate` non esiste su iOS, e alcuni browser la
// ignorano finché la pagina non ha ricevuto un tocco, quindi un avviso in arrivo può non
// arrivare mai. Ogni cosa che vibra dice la stessa cosa anche a schermo.

/** Il tocco è stato registrato (conferma a due tempi). */
export const TICK = 10;
/** Tocca a te, o qualcuno ti ha superato: alza la testa. */
export const NUDGE = 25;
/** Ti sta bloccando la partita: un debito da saldare. */
export const KNOCK = [0, 30, 60, 30];
/** Due dadi che si posano. */
export const DICE = [8, 40, 8];

export function buzz(pattern: number | number[]): void {
  // non è il segnale giusto (l'aptica non dà nausea) ma è l'unico che il browser dà:
  // chi chiede meno movimento chiede meno stimoli. Al posto suo va un interruttore.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate?.(pattern);
}
