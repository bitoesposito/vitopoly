import type { ClientAction, GameEvent, GameState } from "./types";

// State as broadcast to clients: seed + deck order stripped (the only secrets in Monopoly).
export type PublicState = Omit<GameState, "seed" | "decks">;

export interface ChatMsg {
  pid: string;
  name: string;
  text: string;
  ts: number; // ms epoch, set by server
}

export type ClientMsg =
  | { type: "action"; action: ClientAction }
  | { type: "chat"; text: string };

export type ServerMsg =
  | { type: "state"; state: PublicState; events: GameEvent[] }
  | { type: "chat"; msg: ChatMsg }
  | { type: "chatHistory"; msgs: ChatMsg[] }
  | { type: "error"; error: string };

// The ONLY function that turns internal state into wire state. Broadcast must go through here.
export function redact(s: GameState): PublicState {
  const { seed, decks, ...rest } = s;
  void seed; // stripped: seed would let clients predict all future dice
  void decks; // stripped: deck order is the only hidden info
  return rest;
}
