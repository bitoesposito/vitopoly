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

// Eventi di gioco e chat in un registro solo. Gli eventi del motore non hanno un orario:
// l'unico ordine comune è quello d'arrivo, con un contatore che non torna indietro quando
// la lista si accorcia. Solo la cronologia caricata all'ingresso è approssimata (prima il
// registro, poi la chat).
export type FeedInput = { ev: GameEvent } | { msg: ChatMsg };
export type FeedItem = FeedInput & { seq: number };
let feedSeq = 0;
const stamp = (i: FeedInput): FeedItem => ({ ...i, seq: ++feedSeq });

/** La posizione MOSTRATA di una pedina, col verso in cui ci è arrivata. */
export interface TokenStep {
  pos: TileId;
  back?: boolean;
}

interface Store {
  myId: string;
  name: string;
  code: string | null;
  game: PublicState | null;
  feed: FeedItem[]; // registro del tabellone: eventi + chat, in ordine d'arrivo
  chat: ChatMsg[]; // la trascrizione, come la manda il server (la rimanda intera a ogni rientro)
  connected: boolean;
  retries: number; // riconnessioni consecutive: oltre la soglia il banner offre di ricaricare
  error: string | null;
  tradeOpen: boolean; // composer scambi aperto (sezione sotto gli scambi, non blocca nulla)
  tradeHidden: Record<string, boolean>; // proposte in arrivo nascoste (restano listate negli scambi)
  popups: CardPopup[];
  tokenStep: Partial<Record<string, TokenStep>>; // display positions, choreographed by ws.ts; fallback = game pos
  landed: TileId | null; // casella su cui una pedina si è appena posata, per mezzo secondo
  pushFeed: (items: FeedInput[]) => void;
  pushChat: (m: ChatMsg) => void;
  pushPopups: (p: PopupInput[]) => void;
  removePopup: (id: number) => void;
  setTokenStep: (pid: string, step: TokenStep) => void;
  setLanded: (tile: TileId | null) => void;
}

export const useGame = create<Store>((set) => ({
  myId: myId(),
  name: localStorage.getItem("tangentopoly:name") || "",
  code: null,
  game: null,
  feed: [],
  chat: [],
  connected: false,
  retries: 0,
  error: null,
  tradeOpen: false,
  tradeHidden: {},
  popups: [],
  tokenStep: {},
  landed: null,
  pushFeed: (items) => set((s) => ({ feed: [...s.feed, ...items.map(stamp)].slice(-120) })),
  // un messaggio va in due liste: la trascrizione della chat e il registro del tabellone
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-100), feed: [...s.feed, stamp({ msg: m })].slice(-120) })),
  // same-batch pushes get a built-in stagger so they enter one after the other, stacked
  pushPopups: (p) =>
    set((s) => ({
      popups: [...s.popups, ...p.map((x, i) => ({ ...x, wait: x.wait ?? i * 700, id: ++popupSeq }) as CardPopup)].slice(-8),
    })),
  removePopup: (id) => set((s) => ({ popups: s.popups.filter((x) => x.id !== id) })),
  setTokenStep: (pid, step) => set((s) => ({ tokenStep: { ...s.tokenStep, [pid]: step } })),
  setLanded: (tile) => set({ landed: tile }),
}));
