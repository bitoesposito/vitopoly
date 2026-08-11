// Il gioco non ha audio: il motorino è l'unico canale non visivo. È un rinforzo, mai
// l'unico segnale — l'API non esiste su WebKit (nessun browser iOS, Chrome compreso) e
// Chrome la scarta se la pagina non ha mai ricevuto un tocco o non è in primo piano,
// quindi ogni cosa che vibra si vede anche a schermo.

// Il primo numero è già vibrazione, non attesa: [30, 60, 30] = colpo, pausa, colpo.
// Sotto i ~20ms un motore a massa rotante non fa in tempo a partire, quindi qui non si
// scende: sono durate, non intensità, e su hardware scarso la durata è l'unica leva.

/** Il tocco è stato registrato (conferma a due tempi). */
export const TICK = 20;
/** Tocca a te, o qualcuno ti ha superato: alza la testa. */
export const NUDGE = 40;
/** Ti sta bloccando la partita: un debito da saldare. Due colpi, come alla porta. */
export const KNOCK = [30, 60, 30];
/** Due dadi che si posano. */
export const DICE = [15, 45, 15];

export function buzz(pattern: number | number[]): void {
  navigator.vibrate?.(pattern);
}
