import type { GameState, PlayerId, TileId } from "./types";
import { BOARD, groupTiles } from "./board-data";

// Asset management: build/sell/mortgage. Mounted under BOTH postRoll and debt nodes.
// Each returns an error string or null on success (state mutated in place — caller passes a clone).
// `perche<Op>` dice perché non si può (null = si può): il client li chiama per spegnere
// i bottoni col motivo giusto, il motore prima di mutare. Le regole stanno solo qui.

/** Vista minima dei predicati: la stessa che ha il client (PublicState). */
export type Regole = Pick<GameState, "props" | "players" | "settings" | "bank">;

const chi = (s: Regole, pid: PlayerId) => s.players.find((p) => p.id === pid);

export function percheNoBuild(s: Regole, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  const p = chi(s, pid);
  if (def.kind !== "street" || !own || own.owner !== pid) return "non è una tua strada";
  if (own.mortgaged) return "è ipotecata";
  if (own.houses >= 5) return "c'è già un hotel";
  const group = groupTiles(def.group!);
  if (!group.every((t) => s.props[t]?.owner === pid)) return "serve l'intero gruppo di colore";
  if (group.some((t) => s.props[t]!.mortgaged)) return "il gruppo ha strade ipotecate";
  if (s.settings.evenBuild && own.houses !== Math.min(...group.map((t) => s.props[t]!.houses))) return "costruisci in modo uniforme";
  if ((p?.cash ?? 0) < def.houseCost!) return "non te lo puoi permettere";
  const toHotel = own.houses === 4;
  if (toHotel && s.bank.hotels < 1) return "la banca ha finito gli hotel";
  if (!toHotel && s.bank.houses < 1) return "la banca ha finito le case";
  return null;
}

export function percheNoSellHouse(s: Regole, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (def.kind !== "street" || !own || own.owner !== pid) return "non è una tua strada";
  if (own.houses === 0) return "niente da vendere";
  const group = groupTiles(def.group!);
  if (s.settings.evenBuild && own.houses !== Math.max(...group.map((t) => s.props[t]!.houses))) return "vendi in modo uniforme";
  return null;
}

export function percheNoMortgage(s: Regole, pid: PlayerId, tile: TileId): string | null {
  if (!s.settings.mortgageAllowed) return "ipoteche disabilitate in questa partita";
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (own.mortgaged) return "già ipotecata";
  if (def.group && groupTiles(def.group).some((t) => (s.props[t]?.houses ?? 0) > 0)) return "il gruppo ha edifici";
  return null;
}

export function percheNoSellProperty(s: Regole, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (own.mortgaged) return "già ipotecata — niente da vendere";
  if (own.houses > 0) return "prima vendi gli edifici";
  if (def.group && groupTiles(def.group).some((t) => (s.props[t]?.houses ?? 0) > 0)) return "il gruppo ha edifici";
  return null;
}

export function percheNoUnmortgage(s: Regole, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (!own.mortgaged) return "non è ipotecata";
  if ((chi(s, pid)?.cash ?? 0) < Math.ceil((def.price! / 2) * 1.1)) return "non te lo puoi permettere";
  return null;
}

/** Costo del riscatto: metà prezzo più il 10%. */
export const costoRiscatto = (tile: TileId) => Math.ceil((BOARD[tile].price! / 2) * 1.1);

export function build(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = percheNoBuild(s, pid, tile);
  if (no) return no;
  const def = BOARD[tile];
  const own = s.props[tile]!;
  const p = chi(s, pid)!;
  const toHotel = own.houses === 4;
  p.cash -= def.houseCost!;
  if (toHotel) {
    s.bank.hotels--;
    s.bank.houses += 4; // the 4 houses go back to the bank
  } else {
    s.bank.houses--;
  }
  own.houses++;
  return null;
}

export function sellHouse(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = percheNoSellHouse(s, pid, tile);
  if (no) return no;
  const def = BOARD[tile];
  const own = s.props[tile]!;
  const p = chi(s, pid)!;
  if (own.houses === 5) {
    if (s.bank.houses >= 4) {
      // hotel -> 4 houses
      s.bank.hotels++;
      s.bank.houses -= 4;
      own.houses = 4;
      p.cash += def.houseCost! / 2;
    } else {
      // building shortage — sell the whole hotel in one block (documented deviation)
      s.bank.hotels++;
      own.houses = 0;
      p.cash += (def.houseCost! * 5) / 2;
    }
  } else {
    s.bank.houses++;
    own.houses--;
    p.cash += def.houseCost! / 2;
  }
  return null;
}

export function mortgage(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = percheNoMortgage(s, pid, tile);
  if (no) return no;
  const def = BOARD[tile];
  s.props[tile]!.mortgaged = true;
  chi(s, pid)!.cash += def.price! / 2;
  return null;
}

// ponytail: sale to the bank at flat half price (mortgage parity); tune if it warps the economy
export function sellProperty(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = percheNoSellProperty(s, pid, tile);
  if (no) return no;
  const def = BOARD[tile];
  delete s.props[tile];
  chi(s, pid)!.cash += def.price! / 2;
  return null;
}

export function unmortgage(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = percheNoUnmortgage(s, pid, tile);
  if (no) return no;
  const own = s.props[tile]!;
  const p = chi(s, pid)!;
  const cost = costoRiscatto(tile);
  p.cash -= cost;
  own.mortgaged = false;
  return null;
}
