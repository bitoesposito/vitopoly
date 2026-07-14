import type { GameSettings, GameState, Player, PlayerId } from "./types";

export const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 4,
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

// Membership is a server concern, not a game action — mutate directly, not via apply().
export function addPlayer(s: GameState, id: PlayerId, name: string): Player | null {
  if (s.players.some((p) => p.id === id)) return s.players.find((p) => p.id === id)!; // reconnect
  if (s.status !== "lobby") return null;
  if (s.players.length >= s.settings.maxPlayers) return null;
  const p: Player = {
    id,
    name,
    token: s.players.length,
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
