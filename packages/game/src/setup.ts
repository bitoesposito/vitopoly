import type { GameState, Player, PlayerId } from "./types";

/** Il regolamento della casa non è configurabile: `updateSettings` non esiste sul filo.
 *  Questa è la sola cifra che vale la pena nominare. */
export const CASSA_INIZIALE = 1500;

export function createGame(seed: number): GameState {
  return {
    status: "lobby",
    seed: seed || 1, // seed 0 is a fixed point of xorshift32
    vacationPot: 0,
    players: [],
    current: 0,
    props: {},
    bank: { houses: 32, hotels: 12 },
    decks: { chance: [], chest: [] },
    phase: { t: "preRoll" },
    stack: [],
    trades: [],
    kickVotes: {},
    log: [],
  };
}

export const MAX_NAME = 20;
export const TOKENS = 8; // inchiostri disponibili

/** Nome libero: se è già di un altro giocatore aggiunge un numero. Confronto senza
 *  maiuscole e spazi, perché "Vito" e "vito " sono la stessa persona a colpo d'occhio. */
export function freeName(s: GameState, want: string, exceptId?: PlayerId): string {
  const base = want.trim().slice(0, MAX_NAME) || "Giocatore";
  const taken = (n: string) => s.players.some((p) => p.id !== exceptId && p.name.trim().toLowerCase() === n.trim().toLowerCase());
  if (!taken(base)) return base;
  for (let i = 2; i < 100; i++) {
    const cand = `${base.slice(0, MAX_NAME - 3)} ${i}`;
    if (!taken(cand)) return cand;
  }
  return base;
}

/** Primo inchiostro non occupato, oppure -1. Non ricicla: due giocatori con lo stesso
 *  inchiostro avrebbero anche la stessa lettera e lo stesso scostamento sulla plancia,
 *  cioè due pedine perfettamente sovrapposte e indistinguibili. Il tetto di `addPlayer`
 *  garantisce che un posto libero ci sia sempre. */
export function freeToken(s: GameState, exceptId?: PlayerId): number {
  const used = new Set(s.players.filter((p) => p.id !== exceptId).map((p) => p.token));
  for (let i = 0; i < TOKENS; i++) if (!used.has(i)) return i;
  return -1;
}

/** Sedersi al tavolo. Competenza del server, non un'azione di gioco: muta direttamente.
 *  `null` = non c'è posto (partita iniziata o tavolo pieno) -> spettatore. */
export function addPlayer(s: GameState, id: PlayerId, name: string): Player | null {
  if (s.players.some((p) => p.id === id)) return s.players.find((p) => p.id === id)!; // rientro
  if (s.status !== "lobby") return null;
  // Il tetto è il numero di inchiostri: oltre, due giocatori sarebbero indistinguibili
  // sulla plancia (stesso colore, stessa lettera, stesso scostamento). Chi arriva dopo
  // guarda, come chi arriva a partita iniziata.
  const token = freeToken(s);
  if (token < 0) return null;
  const p: Player = {
    id,
    name: freeName(s, name),
    token,
    cash: CASSA_INIZIALE,
    pos: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    doublesCount: 0,
    bankrupt: false,
    connected: true,
  };
  s.players.push(p);
  return p;
}

export function setConnected(s: GameState, id: PlayerId, connected: boolean): void {
  const p = s.players.find((x) => x.id === id);
  if (p) p.connected = connected;
}
