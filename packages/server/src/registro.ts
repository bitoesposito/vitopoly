import type { GameState } from "@tangentopoly/game";
import type { Env } from "./index";

// Il registro esatto delle partite, su D1. Analytics Engine racconta le tendenze ma a bassi
// volumi perde qualche punto e ci mette minuti; qui una partita è una riga, "quante" è un
// conteggio e "chi ha giocato" è una join.
//
// Nessuna scrittura qui può far cadere una partita: se D1 non risponde, si logga e si tira
// avanti. Il gioco vive nel Durable Object, questo è solo il verbale.
async function prova(cosa: string, p: Promise<unknown>): Promise<void> {
  try {
    await p;
  } catch (e) {
    console.error(`registro: ${cosa} non scritto:`, e);
  }
}

/** Chi entra, appena entra: qui si sa la provenienza, che a fine partita nessuno ricorda. */
export function entra(
  env: Env,
  codice: string,
  p: { pid: string; nome: string; inchiostro: number | null; paese: string; dispositivo: string; spettatore: boolean }
): Promise<void> {
  if (!env.PARTITE || !codice) return Promise.resolve();
  return prova(
    "ingresso",
    env.PARTITE.prepare(
      `INSERT INTO partecipanti (codice, pid, nome, inchiostro, paese, dispositivo, entrato_il, spettatore)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (codice, pid) DO UPDATE SET nome = excluded.nome, inchiostro = excluded.inchiostro`
    )
      .bind(codice, p.pid, p.nome, p.inchiostro, p.paese, p.dispositivo, Date.now(), p.spettatore ? 1 : 0)
      .run()
  );
}

/** La riga della partita, riscrivibile: si chiude a fine partita e si ritocca allo sfratto. */
export function chiude(
  env: Env,
  codice: string,
  g: GameState,
  d: { aperta: number; iniziata: number | null; esito: string; umane: number; auto: number }
): Promise<void> {
  if (!env.PARTITE || !codice) return Promise.resolve();
  const ora = Date.now();
  const vinto = g.players.find((p) => p.id === g.winner);
  const durata = d.iniziata ? Math.round((ora - d.iniziata) / 1000) : null;
  const righe = [
    env.PARTITE.prepare(
      `INSERT INTO partite (codice, aperta_il, iniziata_il, chiusa_il, durata_s, esito, giocatori, falliti,
                            vincitore_pid, vincitore, vincitore_cassa, azioni_umane, azioni_auto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (codice) DO UPDATE SET
         iniziata_il = excluded.iniziata_il, chiusa_il = excluded.chiusa_il, durata_s = excluded.durata_s,
         esito = excluded.esito, giocatori = excluded.giocatori, falliti = excluded.falliti,
         vincitore_pid = excluded.vincitore_pid, vincitore = excluded.vincitore,
         vincitore_cassa = excluded.vincitore_cassa, azioni_umane = excluded.azioni_umane,
         azioni_auto = excluded.azioni_auto`
    ).bind(
      codice,
      d.aperta,
      d.iniziata,
      ora,
      durata,
      d.esito,
      g.players.length,
      g.players.filter((p) => p.bankrupt).length,
      g.winner ?? null,
      vinto?.name ?? null,
      vinto?.cash ?? null,
      d.umane,
      d.auto
    ),
    // come sono finiti i partecipanti: il contante è già il patrimonio liquido, il resto si
    // ricava da chi ha vinto
    ...g.players.map((p) =>
      env
        .PARTITE!.prepare(`UPDATE partecipanti SET bancarotta = ?, cassa = ?, nome = ? WHERE codice = ? AND pid = ?`)
        .bind(p.bankrupt ? 1 : 0, p.cash, p.name, codice, p.id)
    ),
  ];
  return prova("chiusura", env.PARTITE.batch(righe));
}
