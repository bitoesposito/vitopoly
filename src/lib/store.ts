import { create } from "zustand";
import type { ChatMsg, GameEvent, PublicState } from "@vitopoly/game";

function getMyId(): string {
  let id = localStorage.getItem("vitopoly:pid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("vitopoly:pid", id);
  }
  return id;
}

interface Store {
  myId: string;
  name: string;
  code: string | null;
  game: PublicState | null;
  events: GameEvent[];
  chat: ChatMsg[];
  connected: boolean;
  error: string | null;
  set: (p: Partial<Store>) => void;
  pushEvents: (e: GameEvent[]) => void;
  pushChat: (m: ChatMsg) => void;
}

export const useGame = create<Store>((set) => ({
  myId: getMyId(),
  name: localStorage.getItem("vitopoly:name") || "",
  code: null,
  game: null,
  events: [],
  chat: [],
  connected: false,
  error: null,
  set: (p) => set(p),
  pushEvents: (e) => set((s) => ({ events: [...s.events, ...e].slice(-100) })),
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-100) })),
}));
