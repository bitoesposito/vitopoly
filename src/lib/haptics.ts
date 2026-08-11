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

// Come il gioco chiede attenzione. Due modi perché di canali non visivi ce n'è uno solo:
// "sonoro" si infila in MODI il giorno che il gioco avrà un audio, e il bottone in testata
// gira su tre voci invece di due senza altre modifiche.
// È una preferenza di dispositivo, non di partita: vive in localStorage accanto al posto e
// non viaggia sulla socket.
const CHIAVE = "tangentopoly:modo";

export const MODI = ["vibrazione", "silenzioso"] as const;
export type Modo = (typeof MODI)[number];

/** Su desktop `vibrate` esiste e non fa niente: senza un dito non c'è motore. */
export const aptico = () => "vibrate" in navigator && matchMedia("(any-pointer: coarse)").matches;

export function modo(): Modo {
  const m = localStorage.getItem(CHIAVE) as Modo | null;
  return m && MODI.includes(m) ? m : "vibrazione";
}

export const setModo = (m: Modo) => localStorage.setItem(CHIAVE, m);

export function buzz(pattern: number | number[]): void {
  if (modo() === "vibrazione") navigator.vibrate?.(pattern);
}
