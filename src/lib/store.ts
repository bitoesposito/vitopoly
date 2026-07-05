import { create } from "zustand";
import type { ChatMsg, GameEvent, PublicState } from "@vitopoly/game";
import type { Lang } from "./i18n";

function getMyId(): string {
  let id = localStorage.getItem("vitopoly:pid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("vitopoly:pid", id);
  }
  return id;
}

const initialLang: Lang =
  (localStorage.getItem("vitopoly:lang") as Lang) || (navigator.language.startsWith("it") ? "it" : "en");

export type Theme = "light" | "dark";
const initialTheme: Theme = (localStorage.getItem("vitopoly:theme") as Theme) || "dark";

interface Store {
  myId: string;
  name: string;
  code: string | null;
  game: PublicState | null;
  events: GameEvent[];
  chat: ChatMsg[];
  connected: boolean;
  error: string | null;
  lang: Lang;
  theme: Theme;
  set: (p: Partial<Store>) => void;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
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
  lang: initialLang,
  theme: initialTheme,
  set: (p) => set(p),
  setLang: (l) => {
    localStorage.setItem("vitopoly:lang", l);
    set({ lang: l });
  },
  setTheme: (th) => {
    localStorage.setItem("vitopoly:theme", th);
    document.documentElement.classList.toggle("dark", th === "dark");
    set({ theme: th });
  },
  pushEvents: (e) => set((s) => ({ events: [...s.events, ...e].slice(-100) })),
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-100) })),
}));
