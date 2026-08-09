import { create } from "zustand";
import { myId } from "./seat";
import type { Bundle, ChatMsg, GameEvent, PublicState, TileId } from "@tangentopoly/game";

// Event card popup: an animated card for the notable moments (see EventCard.tsx).
// Popups stack visually and each dismisses itself; `wait` delays the entrance
// (used to stagger same-batch bursts pushed together).
// PopupBody separato: Omit su (unione & oggetto) collasserebbe alle sole chiavi comuni.
type PopupBody =
  | { kind: "chance" | "chest"; name: string; text: string }
  | { kind: "jailed"; name: string; you: boolean }
  | { kind: "buy"; name: string; tile: TileId; price: number }
  | { kind: "trade"; from: string; to: string; give: Bundle; get: Bundle };
export type CardPopup = PopupBody & { id: number; wait: number };
export type PopupInput = PopupBody & { wait?: number };
let popupSeq = 0;

interface Store {
  myId: string;
  name: string;
  code: string | null;
  game: PublicState | null;
  events: GameEvent[];
  chat: ChatMsg[];
  connected: boolean;
  retries: number; // riconnessioni consecutive: oltre la soglia il banner offre di ricaricare
  error: string | null;
  tradeOpen: boolean; // composer scambi aperto (sezione sotto gli scambi, non blocca nulla)
  tradeHidden: Record<string, boolean>; // proposte in arrivo nascoste (restano listate negli scambi)
  popups: CardPopup[];
  tokenPos: Partial<Record<string, TileId>>; // display positions, choreographed by ws.ts; fallback = game pos
  pushEvents: (e: GameEvent[]) => void;
  pushChat: (m: ChatMsg) => void;
  pushPopups: (p: PopupInput[]) => void;
  removePopup: (id: number) => void;
  setTokenPos: (pid: string, pos: TileId) => void;
}

export const useGame = create<Store>((set) => ({
  myId: myId(),
  name: localStorage.getItem("tangentopoly:name") || "",
  code: null,
  game: null,
  events: [],
  chat: [],
  connected: false,
  retries: 0,
  error: null,
  tradeOpen: false,
  tradeHidden: {},
  popups: [],
  tokenPos: {},
  pushEvents: (e) => set((s) => ({ events: [...s.events, ...e].slice(-100) })),
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-100) })),
  // same-batch pushes get a built-in stagger so they enter one after the other, stacked
  pushPopups: (p) =>
    set((s) => ({
      popups: [...s.popups, ...p.map((x, i) => ({ ...x, wait: x.wait ?? i * 700, id: ++popupSeq }) as CardPopup)].slice(-8),
    })),
  removePopup: (id) => set((s) => ({ popups: s.popups.filter((x) => x.id !== id) })),
  setTokenPos: (pid, pos) => set((s) => ({ tokenPos: { ...s.tokenPos, [pid]: pos } })),
}));
