import type { Env } from "./index";

// Il registro delle partite, servito in JSON a chi ha la chiave: è così che Grafana ci
// arriva, perché D1 non è un suo datasource.
//
// Viste con un nome, non SQL libero: da fuori si sceglie QUALE domanda fare, mai come. Una
// rotta che accetta SQL è una rotta che prima o poi lo esegue per qualcun altro.
const VISTE: Record<string, string> = {
  partite: `SELECT codice, esito, giocatori, falliti, vincitore, vincitore_cassa, durata_s,
                   azioni_umane, azioni_auto, aperta_il, iniziata_il, chiusa_il
            FROM partite WHERE chiusa_il BETWEEN ?1 AND ?2 ORDER BY chiusa_il DESC LIMIT 500`,

  giorni: `SELECT date(chiusa_il / 1000, 'unixepoch') AS giorno, COUNT(*) AS partite,
                  ROUND(AVG(durata_s) / 60.0, 1) AS minuti_medi, ROUND(SUM(COALESCE(durata_s, 0)) / 60.0) AS minuti_giocati,
                  ROUND(AVG(giocatori), 1) AS giocatori_medi,
                  SUM(CASE WHEN esito = 'finita' THEN 1 ELSE 0 END) AS finite,
                  SUM(CASE WHEN esito = 'abbandonata' THEN 1 ELSE 0 END) AS abbandonate,
                  SUM(CASE WHEN esito = 'mai iniziata' THEN 1 ELSE 0 END) AS mai_iniziate
           FROM partite WHERE chiusa_il BETWEEN ?1 AND ?2 GROUP BY giorno ORDER BY giorno`,

  esiti: `SELECT esito, COUNT(*) AS partite, ROUND(AVG(durata_s) / 60.0, 1) AS minuti_medi,
                 ROUND(MAX(durata_s) / 60.0, 1) AS piu_lunga_min
          FROM partite WHERE chiusa_il BETWEEN ?1 AND ?2 GROUP BY esito ORDER BY partite DESC`,

  giocatori: `SELECT '[' || substr(pa.pid, -4) || ']' ||
                     (SELECT nome FROM partecipanti u WHERE u.pid = pa.pid ORDER BY u.entrato_il DESC LIMIT 1) AS nome,
                     COUNT(DISTINCT pa.nome) AS nomi_usati, pa.pid,
                     COUNT(DISTINCT pa.codice) AS partite,
                     SUM(COALESCE(pa.bancarotta, 0)) AS bancarotte,
                     MIN(pa.entrato_il) AS prima_volta, MAX(pa.entrato_il) AS ultima_volta,
                     (SELECT COUNT(*) FROM partite p WHERE p.vincitore_pid = pa.pid) AS vittorie
              FROM partecipanti pa WHERE pa.spettatore = 0 AND pa.entrato_il BETWEEN ?1 AND ?2
              GROUP BY pa.pid ORDER BY partite DESC LIMIT 200`,

  dispositivi: `SELECT dispositivo, paese, COUNT(DISTINCT pid) AS persone, COUNT(*) AS ingressi
                FROM partecipanti WHERE entrato_il BETWEEN ?1 AND ?2
                GROUP BY dispositivo, paese ORDER BY ingressi DESC`,

  // chi è dentro adesso: i partecipanti esistono dall'ingresso, la riga della partita solo
  // dalla chiusura — una stanza senza riga è una stanza ancora viva (o morta da meno di 5')
  aperte: `SELECT pa.codice, COUNT(*) AS quanti,
                  group_concat('[' || substr(pa.pid, -4) || ']' || pa.nome, ', ') AS giocatori,
                  MIN(pa.entrato_il) AS dal, (unixepoch() * 1000 - MIN(pa.entrato_il)) / 1000 AS da_quanto_s
           FROM partecipanti pa LEFT JOIN partite p ON p.codice = pa.codice
           WHERE p.codice IS NULL AND pa.spettatore = 0
           GROUP BY pa.codice ORDER BY dal DESC`,

  tavoli: `SELECT p.codice, p.aperta_il, p.esito, p.durata_s, p.giocatori,
                  group_concat(CASE WHEN pa.spettatore = 0
                                    THEN '[' || substr(pa.pid, -4) || ']' || pa.nome END, ', ') AS chi,
                  p.vincitore
           FROM partite p LEFT JOIN partecipanti pa ON pa.codice = p.codice
           WHERE p.aperta_il BETWEEN ?1 AND ?2
           GROUP BY p.codice ORDER BY p.aperta_il DESC LIMIT 200`,

  // Una persona è un pid, non un nome: il nome lo si sceglie a ogni ingresso, il pid resta
  // nel localStorage. Ogni conteggio di persone qui dentro passa da DISTINCT pid.
  sintesi: `SELECT COUNT(*) AS partite,
                   ROUND(100.0 * SUM(CASE WHEN esito = 'finita' THEN 1 ELSE 0 END) / COUNT(*), 1) AS completamento,
                   ROUND(AVG(CASE WHEN esito = 'finita' THEN durata_s END) / 60.0, 1) AS minuti_finite,
                   ROUND(AVG(giocatori), 1) AS persone_per_partita,
                   (SELECT COUNT(DISTINCT pid) FROM partecipanti
                    WHERE spettatore = 0 AND entrato_il BETWEEN ?1 AND ?2) AS persone
            FROM partite WHERE chiusa_il BETWEEN ?1 AND ?2`,

  // quante persone tornano: la domanda di lungo periodo, in quattro secchi
  frequenza: `WITH conteggio AS (
                SELECT pid, COUNT(DISTINCT codice) AS n FROM partecipanti
                WHERE spettatore = 0 AND entrato_il BETWEEN ?1 AND ?2 GROUP BY pid)
              SELECT CASE WHEN n = 1 THEN '1 partita' WHEN n = 2 THEN '2 partite'
                          WHEN n <= 5 THEN 'da 3 a 5' ELSE '6 o più' END AS quante,
                     COUNT(*) AS persone
              FROM conteggio GROUP BY quante ORDER BY MIN(n)`,

  ritorno: `WITH prime AS (SELECT pid, MIN(entrato_il) AS p FROM partecipanti WHERE spettatore = 0 GROUP BY pid)
            SELECT date(pa.entrato_il / 1000, 'unixepoch') AS giorno,
                   COUNT(DISTINCT CASE WHEN date(pa.entrato_il / 1000, 'unixepoch') = date(pr.p / 1000, 'unixepoch')
                                       THEN pa.pid END) AS nuovi,
                   COUNT(DISTINCT CASE WHEN date(pa.entrato_il / 1000, 'unixepoch') > date(pr.p / 1000, 'unixepoch')
                                       THEN pa.pid END) AS di_ritorno
            FROM partecipanti pa JOIN prime pr ON pr.pid = pa.pid
            WHERE pa.spettatore = 0 AND pa.entrato_il BETWEEN ?1 AND ?2
            GROUP BY giorno ORDER BY giorno`,
};

// Le date all'italiana le fa Intl, non Grafana: là il formato vive nella config del server,
// che su Cloud non si tocca. Ogni numero che è un millisecondo d'epoca si porta dietro un
// gemello leggibile — `aperta_il` e `aperta_il_it` — così le tabelle mostrano il testo e i
// grafici continuano a usare il numero.
const ORA_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Rome",
});
const leggibile = (r: Record<string, unknown>) => {
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === "number" && v > 1e12) r[`${k}_it`] = ORA_IT.format(v).replace(",", "");
  }
  return r;
};

export async function serviVista(env: Env, url: URL, chiave: string | null): Promise<Response> {
  if (!env.REGISTRO_CHIAVE || chiave !== env.REGISTRO_CHIAVE) return new Response("chiave mancante o sbagliata", { status: 403 });
  if (!env.PARTITE) return Response.json([]);
  const sql = VISTE[url.searchParams.get("vista") ?? ""];
  if (!sql) return Response.json({ viste: Object.keys(VISTE) }, { status: 400 });
  // la finestra arriva da Grafana in ms epoch; senza, tutto
  const da = Number(url.searchParams.get("da")) || 0;
  const a = Number(url.searchParams.get("a")) || Date.now() + 86_400_000;
  // "aperte" guarda l'adesso e non ha segnaposti: legare parametri a una query che non li
  // aspetta è un errore, non un no-op
  const st = env.PARTITE.prepare(sql);
  const { results } = await (sql.includes("?1") ? st.bind(da, a) : st).all();
  return Response.json((results as Record<string, unknown>[]).map(leggibile));
}
