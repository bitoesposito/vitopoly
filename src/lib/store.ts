import { create } from "zustand";
import type { ChatMsg, GameEvent, PublicState } from "@tangentopoly/game";
import type { Lang } from "./i18n";

function getMyId(): string {
  let id = localStorage.getItem("tangentopoly:pid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("tangentopoly:pid", id);
  }
  return id;
}

const initialLang: Lang =
  (localStorage.getItem("tangentopoly:lang") as Lang) || (navigator.language.startsWith("it") ? "it" : "en");

export type Theme = "light" | "dark";
const initialTheme: Theme = (localStorage.getItem("tangentopoly:theme") as Theme) || "dark";

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
  name: localStorage.getItem("tangentopoly:name") || "",
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
    localStorage.setItem("tangentopoly:lang", l);
    set({ lang: l });
  },
  setTheme: (th) => {
    localStorage.setItem("tangentopoly:theme", th);
    document.documentElement.classList.toggle("dark", th === "dark");
    set({ theme: th });
  },
  pushEvents: (e) => set((s) => ({ events: [...s.events, ...e].slice(-100) })),
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-100) })),
}));
