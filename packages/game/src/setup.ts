import type { GameSettings, GameState, Player, PlayerId } from "./types";

// Regolamento della casa: fisso, nessuna UI e nessuna azione di rete lo cambia.
export const DEFAULT_SETTINGS: GameSettings = {
  startingCash: 1500,
  doubleRentFullSet: true,
  vacationCash: true,
  auction: true,
  noRentInPrison: false,
  mortgageAllowed: true,
  evenBuild: false,
  randomOrder: true,
};

export function createGame(seed: number): GameState {
  return {
    status: "lobby",
    seed: seed || 1, // seed 0 is a fixed point of xorshift32
    settings: { ...DEFAULT_SETTINGS },
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
  const taken = (n: string) =>
    s.players.some((p) => p.id !== exceptId && p.name.trim().toLowerCase() === n.trim().toLowerCase());
  if (!taken(base)) return base;
  for (let i = 2; i < 100; i++) {
    const cand = `${base.slice(0, MAX_NAME - 3)} ${i}`;
    if (!taken(cand)) return cand;
  }
  return base;
}

/** Primo inchiostro non occupato; oltre gli otto giocatori si ricomincia. */
export function freeToken(s: GameState, exceptId?: PlayerId): number {
  const used = new Set(s.players.filter((p) => p.id !== exceptId).map((p) => p.token));
  for (let i = 0; i < TOKENS; i++) if (!used.has(i)) return i;
  return s.players.length % TOKENS;
}

// Membership is a server concern, not a game action — mutate directly, not via apply().
export function addPlayer(s: GameState, id: PlayerId, name: string): Player | null {
  if (s.players.some((p) => p.id === id)) return s.players.find((p) => p.id === id)!; // reconnect
  if (s.status !== "lobby") return null;
  // nessun tetto ai posti: chi arriva dopo l'inizio è spettatore
  const p: Player = {
    id,
    name: freeName(s, name),
    token: freeToken(s),
    cash: s.settings.startingCash, // re-applied at start (settings may change in lobby)
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
