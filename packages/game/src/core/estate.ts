import type { Claim, GameEvent, GameState, PlayerId, TileId } from "../types";
import { BOARD } from "../data/tiles";
import { pushAuction } from "./auction";
import { transfer } from "./money";
import { alive, byId, cur, nextPlayer } from "./players";

// Uscita di scena: come si smonta un patrimonio e come si toglie un giocatore dal
// giro senza lasciare riferimenti pendenti in stack, scambi e voti.

/** Gli edifici si liquidano SEMPRE alla banca a metà prezzo. Ritorna le caselle del patrimonio. */
function liquidateBuildings(s: GameState, pid: PlayerId, ev: GameEvent[]): TileId[] {
  const estate = Object.keys(s.props)
    .map(Number)
    .filter((t) => s.props[t]!.owner === pid);
  for (const t of estate) {
    const own = s.props[t]!;
    if (own.houses === 0) continue;
    const refund = own.houses * (BOARD[t].houseCost! / 2);
    if (own.houses === 5) s.bank.hotels++;
    else s.bank.houses += own.houses;
    own.houses = 0;
    transfer(s, "bank", pid, refund, "liquidation", ev);
  }
  return estate;
}

/** Bancarotta verso giocatori: la banca espropria (edifici e titoli a metà prezzo), i
 *  creditori vengono pagati sul ricavato — anche solo in parte — e i titoli tornano in
 *  gioco all'asta. Nessuno eredita un patrimonio intero. */
export function expropriate(s: GameState, pid: PlayerId, claims: Claim[], ev: GameEvent[]): void {
  const estate = liquidateBuildings(s, pid, ev);
  for (const t of estate) {
    if (!s.props[t]!.mortgaged) transfer(s, "bank", pid, BOARD[t].price! / 2, "expropriation", ev);
    delete s.props[t];
  }
  for (const c of claims) {
    const pay = Math.min(byId(s, pid).cash, c.amount);
    if (pay > 0) transfer(s, pid, c.creditor, pay, "bankruptcy", ev);
  }
  finish(s, pid, estate, ev);
}

/** Tutto il patrimonio cade alla banca e i titoli si rimettono all'asta.
 *  Condivisa da bancarotta verso la banca, ritiro volontario ed espulsione. */
export function seizeToBank(s: GameState, pid: PlayerId, ev: GameEvent[]): void {
  const estate = liquidateBuildings(s, pid, ev);
  for (const t of estate) delete s.props[t];
  finish(s, pid, estate, ev);
}

// Coda comune: la cassa residua va alla banca, il giocatore esce, il patrimonio torna
// all'asta a catena (se la partita non è già finita).
function finish(s: GameState, pid: PlayerId, estate: TileId[], ev: GameEvent[]): void {
  if (byId(s, pid).cash > 0) transfer(s, pid, "bank", byId(s, pid).cash, "bankruptcy", ev);
  eliminate(s, pid, ev);
  if (s.status !== "ended" && estate.length > 0) pushAuction(s, estate[0], estate.slice(1));
}

/** L'unico imbuto: segna il fallimento, ripulisce ogni frame/scambio/voto, passa il turno. */
function eliminate(s: GameState, pid: PlayerId, ev: GameEvent[]): void {
  const p = byId(s, pid);
  p.bankrupt = true;
  ev.push({ e: "bankrupt", pid });

  s.trades = s.trades.filter((t) => t.from !== pid && t.to !== pid);
  // un leader d'asta morto non può capitare: il leader non può passare, le offerte sono
  // limitate ai contanti e gli scambi sono vietati durante un'asta
  for (const f of s.stack) if (f.t === "auction") f.active = f.active.filter((x) => x !== pid);

  delete s.kickVotes[pid];
  for (const k of Object.keys(s.kickVotes)) {
    const rest = s.kickVotes[k]!.filter((v) => v !== pid);
    if (rest.length > 0) s.kickVotes[k] = rest;
    else delete s.kickVotes[k];
  }

  const survivors = alive(s);
  if (survivors.length <= 1) {
    s.status = "ended";
    s.winner = survivors[0]?.id;
    return;
  }
  // la fase congelata del morto va sostituita SOTTO gli interrupt: quelli continuano a bloccare
  if (cur(s).id === pid) nextPlayer(s);
}
