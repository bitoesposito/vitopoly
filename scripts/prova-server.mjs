// Il confine di fiducia del server, provato su un server vero.
// Serve `pnpm dev` acceso; poi: node scripts/prova-server.mjs
import assert from "node:assert/strict";

const API = process.env.SERVER ?? "http://localhost:8787";
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

const stanza = async () => (await (await fetch(`${API}/api/room`, { method: "POST" })).json()).code;
function apri(code, pid, name, token = "") {
  const ws = new WebSocket(`${API.replace("http", "ws")}/api/room/${code}/ws?pid=${pid}&token=${token}&name=${name}`);
  const msg = [];
  ws.onmessage = (e) => msg.push(JSON.parse(e.data));
  return new Promise((res) => (ws.onopen = () => res(Object.assign(ws, { msg, agisci: (a) => ws.send(JSON.stringify({ type: "action", action: a })) }))));
}
const segreto = (s) => s.msg.find((m) => m.type === "seat")?.token;
const stato = (s) => s.msg.filter((m) => m.type === "state").at(-1)?.state;
const errori = (s) => s.msg.filter((m) => m.type === "error").map((m) => m.error);

const code = await stanza();
const vito = await apri(code, "pid-vito", "Vito");
const anna = await apri(code, "pid-anna", "Anna");
await attesa(400);

const tokenVito = segreto(vito);
assert.ok(tokenVito, "il primo che occupa un posto riceve il suo segreto");
assert.ok(segreto(anna) && segreto(anna) !== tokenVito, "segreti distinti per posti distinti");

vito.agisci({ type: "start" });
await attesa(500);
const g = stato(anna);
assert.equal(g.status, "playing");
assert.ok(g.players.some((p) => p.id === "pid-vito"), "i pid viaggiano nello stato pubblico: il segreto è ciò che protegge");

// 1. il pid di un altro, senza il suo segreto, non siede al suo posto
const ladro = await apri(code, "pid-vito", "Ladro");
await attesa(300);
ladro.agisci({ type: "roll" });
ladro.agisci({ type: "bankrupt" });
await attesa(600);
assert.ok(errori(ladro).length >= 1, `l'impostore deve essere respinto, invece: ${JSON.stringify(errori(ladro))}`);
assert.deepEqual(
  stato(anna).players.map((p) => p.bankrupt),
  [false, false],
  "nessuno può far fallire un altro",
);
assert.equal(stato(anna).log.at(-1).text, "partita iniziata", "l'impostore non ha mosso niente");
ladro.close();

// 2. il segreto giusto fa rientrare al proprio posto
vito.close();
await attesa(400);
const rientro = await apri(code, "pid-vito", "Vito", tokenVito);
await attesa(400);
assert.equal(stato(rientro).players.find((p) => p.id === "pid-vito").connected, true, "col segreto si rientra");

// 3. /debug è della stanza, non del mondo
assert.equal((await fetch(`${API}/api/room/${code}/debug`)).status, 403, "/debug senza segreto");
assert.equal((await fetch(`${API}/api/room/${code}/debug?pid=pid-vito&token=${tokenVito}`)).status, 200, "/debug col segreto");

// 4. a stanza vuota nessun timer resta armato: una partita abbandonata non si gioca da sola
rientro.close();
anna.close();
await attesa(1200);
const dopo = await (await fetch(`${API}/api/room/${code}/debug?pid=pid-vito&token=${tokenVito}`)).json();
assert.equal(dopo.players.every((p) => !p.connected), true);
assert.equal(dopo.deadline, undefined, "senza nessuno collegato il turno non ha scadenza");

console.log("tutto a posto: segreti di posto, impostore respinto, rientro, /debug chiuso, timer fermo a stanza vuota");
process.exit(0);
