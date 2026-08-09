export type PlayerId = string;
export type TileId = number; // 0..39, indexes BOARD

export interface Player {
  id: PlayerId;
  name: string;
  token: number;
  cash: number;
  pos: TileId;
  inJail: boolean;
  jailTurns: number;
  jailCards: number;
  doublesCount: number;
  bankrupt: boolean;
  connected: boolean;
}

export interface OwnedProp {
  owner: PlayerId;
  mortgaged: boolean;
  houses: 0 | 1 | 2 | 3 | 4 | 5; // 5 = hotel
}

// ---- The statechart, reified as data --------------------------------

// Base turn phases: ONLY the points where we wait for the current player.
export type TurnPhase =
  | { t: "preRoll" } // roll | payBail | useJailCard
  | { t: "buyPrompt"; tile: TileId; again: boolean } // buy | decline
  | { t: "postRoll"; again: boolean }; // build/sell/mortgage | endTurn (again = doubles)

// Interrupt frames: pushed ON TOP of the frozen turn phase. Top of stack = who we wait for now.
export interface AuctionFrame {
  t: "auction";
  tile: TileId;
  queue: TileId[]; // bankruptcy-to-bank dumps the rest of the estate here
  bid: number;
  leader: PlayerId | null;
  active: PlayerId[]; // still bidding
  bids: { pid: PlayerId; amount: number }[]; // history for the UI log; amount = running total
}
/** Un pagamento dovuto. Una lista di claim = una coda ("paga €50 a ognuno"). */
export interface Claim {
  creditor: PlayerId | "bank";
  amount: number;
}
export interface DebtFrame {
  t: "debt";
  debtor: PlayerId;
  claims: Claim[]; // QUEUE: "pay each player 50" = N claims
  deadline?: number;
}
export type Interrupt = AuctionFrame | DebtFrame;

/** Dove la macchina aspetta: fase di turno, o l'interrupt che la sovrasta. */
export type GameNode = TurnPhase | Interrupt;

// Orthogonal region: trades live ALONGSIDE the turn, not inside it.
export interface Bundle {
  cash: number;
  props: TileId[];
  jailCards: number;
}
export interface Trade {
  id: string;
  from: PlayerId;
  to: PlayerId;
  give: Bundle;
  get: Bundle;
}

// Fisso, non configurabile: i valori vivono in DEFAULT_SETTINGS (setup.ts).
export interface GameSettings {
  startingCash: number;
  doubleRentFullSet: boolean; // x2 base rent on full color group
  vacationCash: boolean; // taxes/bank fees accumulate on Free Parking, landing collects
  auction: boolean; // declined purchase -> auction (off: stays unowned)
  mortgageAllowed: boolean;
  randomOrder: boolean; // shuffle turn order at start
}

export interface GameState {
  status: "lobby" | "playing" | "ended";
  seed: number; // xorshift32 state: dice + shuffles, replayable tests
  settings: GameSettings;
  vacationPot: number; // accumulated bank fees when settings.vacationCash
  players: Player[]; // turn order
  current: number; // index into players
  props: Partial<Record<TileId, OwnedProp>>;
  bank: { houses: number; hotels: number }; // 32 / 12
  decks: { chance: number[]; chest: number[] }; // card ids, draw front, reinsert back
  phase: TurnPhase;
  stack: Interrupt[];
  trades: Trade[];
  kickVotes: Partial<Record<PlayerId, PlayerId[]>>; // target -> voters; unanimity of the others kicks
  log: GameEvent[]; // capped ~100
  winner?: PlayerId;
  deadline?: number; // ms epoch — when the current wait auto-resolves. Set by the server, not the engine.
}

export type ClientAction =
  | { type: "roll" }
  | { type: "payBail" }
  | { type: "useJailCard" }
  | { type: "buy" }
  | { type: "decline" }
  | { type: "bid"; amount: number } // increment over the current bid (quick-bid buttons)
  | { type: "fold" }
  | { type: "build"; tile: TileId }
  | { type: "sellHouse"; tile: TileId }
  | { type: "mortgage"; tile: TileId }
  | { type: "unmortgage"; tile: TileId }
  | { type: "sellProperty"; tile: TileId } // sell the deed back to the bank at half price
  | { type: "payDebt" }
  | { type: "bankrupt" }
  | { type: "endTurn" }
  | { type: "start" }
  | { type: "profile"; name?: string; token?: number } // lobby: nome e inchiostro, solo i propri
  | { type: "proposeTrade"; to: PlayerId; give: Bundle; get: Bundle }
  | { type: "respondTrade"; id: string; accept: boolean }
  | { type: "cancelTrade"; id: string }
  | { type: "votekick"; target: PlayerId };

export type GameEvent =
  | { e: "rolled"; pid: PlayerId; d1: number; d2: number }
  | { e: "moved"; pid: PlayerId; from: TileId; to: TileId }
  | { e: "paid"; from: PlayerId | "bank"; to: PlayerId | "bank"; amount: number; why: string }
  | { e: "card"; pid: PlayerId; deck: "chance" | "chest"; cardId: number }
  | { e: "auctionWon"; pid: PlayerId; tile: TileId; price: number }
  | { e: "jailed"; pid: PlayerId }
  | { e: "bankrupt"; pid: PlayerId }
  | { e: "traded"; from: PlayerId; to: PlayerId; give: Bundle; get: Bundle }
  | {
      e: "asset";
      pid: PlayerId;
      tile: TileId;
      what: "build" | "sellHouse" | "mortgage" | "unmortgage" | "sellProperty";
      amount: number;
      hotel: boolean;
    }
  | { e: "info"; text: string };

export type Result = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
