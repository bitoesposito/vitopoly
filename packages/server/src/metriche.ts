import type { Env } from "./index";

// Cosa sappiamo di come va il gioco, senza sapere nulla di chi gioca: nessun nome, nessun
// messaggio, nessun indirizzo. Solo i momenti che compongono l'imbuto — stanza aperta, chi
// entra, cosa si fa, come finisce — e i numeri che li descrivono.
//
// LO SCHEMA È UN CONTRATTO: le query della dashboard leggono i campi per POSIZIONE.
// Aggiungerne uno in coda è gratis, cambiare l'ordine rompe i grafici in silenzio —
// metriche.test.ts è il cancello che lo impedisce.
//   index1  codice stanza (è anche la chiave di campionamento: i punti di una partita
//           vengono tenuti o scartati insieme, così l'imbuto non si sfalsa)
//   blob1   evento     blob2  dettaglio    blob3  come
//   blob4   pid        blob5  paese        blob6  dispositivo
//   double1 giocatori  double2 conteggio   double3 soldi
// Il pid è l'UUID casuale che il browser si tiene in localStorage: non dice chi sei, dice
// che sei lo stesso di ieri — è ciò che distingue un giocatore di ritorno da uno nuovo.
type Punto = {
  evento: "stanza" | "ingresso" | "azione" | "fine" | "sfratto";
  dettaglio?: string;
  come?: string;
  pid?: string;
  paese?: string;
  dispositivo?: string;
  giocatori?: number;
  falliti?: number;
  soldi?: number;
};

/** Non si aspetta: writeDataPoint torna subito e non tocca lo storage del Durable Object.
 *  Lo stesso punto va anche nei log: per Analytics Engine non esiste una pagina nel
 *  dashboard, per i log sì, e i campi JSON sono indicizzati — si filtra per `metrica` senza
 *  passare da un token. Sono due finestre sulla stessa cosa: tre giorni contro tre mesi. */
export function misura(env: Env, codice: string, p: Punto): void {
  if (!codice) return; // senza codice non c'è niente a cui attribuire il punto
  const { evento, ...resto } = p;
  console.log(JSON.stringify({ metrica: evento, stanza: codice, ...resto }));
  env.METRICHE?.writeDataPoint({
    indexes: [codice],
    blobs: [p.evento, p.dettaglio ?? "", p.come ?? "", p.pid ?? "", p.paese ?? "", p.dispositivo ?? ""],
    doubles: [p.giocatori ?? 0, p.falliti ?? 0, p.soldi ?? 0],
  });
}
