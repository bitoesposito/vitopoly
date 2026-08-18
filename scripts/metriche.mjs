// Come va il gioco, in un comando. Legge Analytics Engine: per quel dataset non esiste una
// pagina nel dashboard, la SQL API è l'unica via (vedi ANALYTICS.md).
//   node scripts/metriche.mjs              → ultimi 7 giorni
//   GIORNI=30 node scripts/metriche.mjs
// Vuole un token con "Account Analytics: Read" in ~/.cf-analytics-token (o
// CLOUDFLARE_API_TOKEN) e l'id account in CLOUDFLARE_ACCOUNT_ID (o ~/.cf-account-id):
// l'id sta fuori dal repo come in deploy.yml, non è roba da committare.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const leggi = (f) => {
  try {
    return readFileSync(join(homedir(), f), "utf8").trim();
  } catch {
    return "";
  }
};
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || leggi(".cf-analytics-token");
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || leggi(".cf-account-id");
const GIORNI = Number(process.env.GIORNI ?? 7);
if (!TOKEN) throw new Error("manca il token: mettilo in ~/.cf-analytics-token (Account Analytics: Read)");
if (!ACCOUNT) throw new Error("manca l'id account: export CLOUDFLARE_ACCOUNT_ID=... oppure scrivilo in ~/.cf-account-id");

const DA = `timestamp > now() - INTERVAL '${GIORNI}' DAY`;
// SUM(_sample_interval) e non count(): se un giorno scattasse il campionamento, contare le
// righe darebbe numeri più bassi del vero senza dirlo.
const N = "SUM(_sample_interval) AS n";

async function sql(q) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: q,
  });
  const testo = await r.text();
  if (r.status === 403) {
    console.error(`La SQL API risponde 403 (${testo.trim()}). Due sole cause possibili:
  1. il token non ha "Account Analytics: Read" — rifallo da Profilo → API Tokens → Custom;
  2. l'account non ha ancora nessun dataset: l'endpoint si apre col primo punto scritto,
     cioè dopo un deploy e una partita vera.
Verifica quale delle due: se anche "SELECT 'ciao' AS m" risponde 403 dopo che una partita
è stata giocata in produzione, allora è il permesso.`);
    process.exit(1);
  }
  if (!r.ok) throw new Error(`la SQL API ha risposto ${r.status}: ${testo.slice(0, 200)}`);
  try {
    return JSON.parse(testo).data ?? [];
  } catch {
    throw new Error(`risposta inattesa: ${testo.slice(0, 200)}`);
  }
}

const conta = (righe) => Object.fromEntries(righe.map((r) => [Object.values(r)[0], Number(r.n)]));
const riga = (etichetta, valore, nota = "") => console.log(`  ${etichetta.padEnd(26)}${String(valore).padStart(7)}  ${nota}`);
const perc = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");

const eventi = conta(await sql(`SELECT blob1 AS k, ${N} FROM tangentopoly WHERE ${DA} GROUP BY k`));
if (!Object.keys(eventi).length) {
  console.log(`Nessun punto negli ultimi ${GIORNI} giorni. Il dataset nasce alla prima scrittura: serve una partita in produzione.`);
  process.exit(0);
}

console.log(`\n■ L'IMBUTO, ultimi ${GIORNI} giorni`);
const stanze = eventi.stanza ?? 0;
riga("stanze aperte", stanze);
riga("stanze con qualcuno", eventi.ingresso ?? 0, perc(eventi.ingresso ?? 0, stanze) + " (ingressi, non stanze)");
riga("azioni giocate", eventi.azione ?? 0);
riga("partite finite", eventi.fine ?? 0, perc(eventi.fine ?? 0, stanze) + " delle stanze aperte");

const morte = conta(await sql(`SELECT blob2 AS k, ${N} FROM tangentopoly WHERE blob1 = 'sfratto' AND ${DA} GROUP BY k`));
if (Object.keys(morte).length) {
  console.log("\n■ COM'È FINITA LA STANZA");
  const tot = Object.values(morte).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(morte).sort((a, b) => b[1] - a[1])) riga(k, v, perc(v, tot));
}

const azioni = await sql(
  `SELECT blob2 AS azione, blob3 AS come, ${N} FROM tangentopoly WHERE blob1 = 'azione' AND ${DA} GROUP BY azione, come ORDER BY n DESC`,
);
if (azioni.length) {
  console.log("\n■ COSA FA LA GENTE (e cosa fa il server al posto suo)");
  const mano = {}, auto = {};
  for (const r of azioni) (r.come === "timeout" ? auto : mano)[r.azione] = Number(r.n);
  const tutte = [...new Set([...Object.keys(mano), ...Object.keys(auto)])].sort((a, b) => (mano[b] ?? 0) + (auto[b] ?? 0) - ((mano[a] ?? 0) + (auto[a] ?? 0)));
  console.log(`  ${"azione".padEnd(26)}${"a mano".padStart(7)}${"auto".padStart(8)}`);
  for (const a of tutte.slice(0, 10)) console.log(`  ${a.padEnd(26)}${String(mano[a] ?? 0).padStart(7)}${String(auto[a] ?? 0).padStart(8)}`);
  const ta = Object.values(auto).reduce((a, b) => a + b, 0), tm = Object.values(mano).reduce((a, b) => a + b, 0);
  console.log(`\n  automatiche sul totale: ${perc(ta, ta + tm)} — se sale, la gente abbandona a metà o il timer è corto`);
}

const spettatori = conta(await sql(`SELECT blob3 AS k, ${N} FROM tangentopoly WHERE blob1 = 'ingresso' AND blob2 = 'spettatore' AND ${DA} GROUP BY k`));
if (Object.keys(spettatori).length) {
  console.log("\n■ CHI È RESTATO A GUARDARE, E PERCHÉ");
  for (const [k, v] of Object.entries(spettatori).sort((a, b) => b[1] - a[1])) riga(k || "(senza motivo)", v);
}

// La durata non è un campo: è la distanza fra il primo e l'ultimo punto della stanza.
const vite = await sql(
  `SELECT index1 AS stanza, MIN(timestamp) AS inizio, MAX(timestamp) AS fine, ${N} FROM tangentopoly WHERE ${DA} GROUP BY stanza ORDER BY n DESC LIMIT 8`,
);
if (vite.length) {
  console.log("\n■ LE STANZE PIÙ VIVE");
  console.log(`  ${"codice".padEnd(12)}${"minuti".padStart(8)}${"punti".padStart(8)}`);
  for (const v of vite) {
    const min = Math.round((new Date(v.fine + "Z") - new Date(v.inizio + "Z")) / 60000);
    console.log(`  ${String(v.stanza).padEnd(12)}${String(Number.isFinite(min) ? min : "?").padStart(8)}${String(v.n).padStart(8)}`);
  }
}
console.log();
