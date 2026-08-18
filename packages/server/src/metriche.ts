import type { Env } from "./index";

// Cosa sappiamo di come va il gioco, senza sapere nulla di chi gioca: nessun nome, nessun
// messaggio, nessun indirizzo. Solo i momenti che compongono l'imbuto — stanza aperta, chi
// entra, cosa si fa, come finisce — e i numeri che li descrivono.
//
// LO SCHEMA È UN CONTRATTO: le query in ANALYTICS.md leggono blob1..3 e double1..3 per
// posizione. Aggiungere un campo in coda è gratis, cambiarne l'ordine rompe le query.
//   index1  codice stanza (è anche la chiave di campionamento: i punti di una partita
//           vengono tenuti o scartati insieme, così l'imbuto non si sfalsa)
//   blob1   evento     blob2  dettaglio     blob3  come
//   double1 giocatori  double2 conteggio    double3 soldi
export type Punto =
  | { evento: "stanza" }
  | { evento: "ingresso"; dettaglio: "posto" | "spettatore"; come?: string; giocatori: number }
  | { evento: "azione"; dettaglio: string; come: "umano" | "timeout"; giocatori: number }
  | { evento: "fine"; giocatori: number; falliti: number; soldi: number }
  | { evento: "sfratto"; dettaglio: "finita" | "abbandonata" | "mai iniziata"; giocatori: number };

/** Non si aspetta: writeDataPoint torna subito e non tocca lo storage del Durable Object.
 *  Lo stesso punto va anche nei log: per Analytics Engine non esiste una pagina nel
 *  dashboard, per i log sì, e i campi JSON sono indicizzati — si filtra per `metrica` senza
 *  passare da un token. Sono due finestre sulla stessa cosa: tre giorni contro tre mesi. */
export function misura(env: Env, codice: string, p: Punto): void {
  const { evento, ...resto } = p;
  console.log(JSON.stringify({ metrica: evento, stanza: codice, ...resto }));
  env.METRICHE?.writeDataPoint({
    indexes: [codice],
    blobs: [p.evento, "dettaglio" in p ? p.dettaglio : "", "come" in p && p.come ? p.come : ""],
    doubles: ["giocatori" in p ? p.giocatori : 0, "falliti" in p ? p.falliti : 0, "soldi" in p ? p.soldi : 0],
  });
}
