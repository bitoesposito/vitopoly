import { describe, expect, it } from "vitest";
import { misura } from "./metriche";
import type { Env } from "./index";

// Le query in ANALYTICS.md leggono per posizione: se qualcuno riordina i campi, i grafici
// mentono senza che niente si rompa. Questo test è il cancello di quel contratto.
describe("schema dei punti", () => {
  const scritti: { indexes: string[]; blobs: string[]; doubles: number[] }[] = [];
  const env = { METRICHE: { writeDataPoint: (p: (typeof scritti)[number]) => scritti.push(p) } } as unknown as Env;
  const ultimo = () => scritti.at(-1);

  it("index1 è il codice stanza, blob1 l'evento, i campi assenti restano vuoti", () => {
    misura(env, "zjxk2p", { evento: "stanza" });
    expect(ultimo()).toEqual({ indexes: ["zjxk2p"], blobs: ["stanza", "", ""], doubles: [0, 0, 0] });
  });

  it("blob2 il dettaglio, blob3 il come", () => {
    misura(env, "zjxk2p", { evento: "ingresso", dettaglio: "spettatore", come: "al completo", giocatori: 8 });
    expect(ultimo()).toEqual({ indexes: ["zjxk2p"], blobs: ["ingresso", "spettatore", "al completo"], doubles: [8, 0, 0] });
    misura(env, "zjxk2p", { evento: "azione", dettaglio: "roll", come: "timeout", giocatori: 3 });
    expect(ultimo()).toEqual({ indexes: ["zjxk2p"], blobs: ["azione", "roll", "timeout"], doubles: [3, 0, 0] });
  });

  it("double1 giocatori, double2 conteggio, double3 soldi", () => {
    misura(env, "zjxk2p", { evento: "fine", giocatori: 4, falliti: 3, soldi: 2540 });
    expect(ultimo()).toEqual({ indexes: ["zjxk2p"], blobs: ["fine", "", ""], doubles: [4, 3, 2540] });
  });

  it("senza binding non esplode: in locale il dataset non c'è", () => {
    expect(() => misura({} as Env, "zjxk2p", { evento: "sfratto", dettaglio: "abbandonata", giocatori: 2 })).not.toThrow();
  });
});
