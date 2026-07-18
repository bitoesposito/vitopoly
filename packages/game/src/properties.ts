import type { GameState, PlayerId, TileId } from "./types";
import { BOARD, groupTiles } from "./board-data";

// Asset management: build/sell/mortgage. Mounted under BOTH postRoll and debt nodes.
// Each returns an error string or null on success (state mutated in place — caller passes a clone).

function findPlayer(s: GameState, pid: PlayerId) {
  return s.players.find((p) => p.id === pid)!;
}

export function build(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  const p = findPlayer(s, pid);
  if (def.kind !== "street" || !own || own.owner !== pid) return "non è una tua strada";
  if (own.houses >= 5) return "c'è già un hotel";
  const group = groupTiles(def.group!);
  if (!group.every((t) => s.props[t]?.owner === pid)) return "serve l'intero gruppo di colore";
  if (group.some((t) => s.props[t]!.mortgaged)) return "il gruppo ha strade ipotecate";
  // even-build: can only build on a street at the group's minimum level
  if (s.settings.evenBuild && own.houses !== Math.min(...group.map((t) => s.props[t]!.houses))) return "costruisci in modo uniforme";
  if (p.cash < def.houseCost!) return "non te lo puoi permettere";
  const toHotel = own.houses === 4;
  if (toHotel && s.bank.hotels < 1) return "la banca ha finito gli hotel";
  if (!toHotel && s.bank.houses < 1) return "la banca ha finito le case";
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
  const def = BOARD[tile];
  const own = s.props[tile];
  const p = findPlayer(s, pid);
  if (def.kind !== "street" || !own || own.owner !== pid) return "non è una tua strada";
  if (own.houses === 0) return "niente da vendere";
  const group = groupTiles(def.group!);
  // even-sell: can only sell from a street at the group's maximum level
  if (s.settings.evenBuild && own.houses !== Math.max(...group.map((t) => s.props[t]!.houses))) return "vendi in modo uniforme";
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
  if (!s.settings.mortgageAllowed) return "ipoteche disabilitate in questa partita";
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (own.mortgaged) return "già ipotecata";
  if (def.group && groupTiles(def.group).some((t) => (s.props[t]?.houses ?? 0) > 0)) return "il gruppo ha edifici";
  own.mortgaged = true;
  findPlayer(s, pid).cash += def.price! / 2;
  return null;
}

// ponytail: sale to the bank at flat half price (mortgage parity); tune if it warps the economy
export function sellProperty(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (own.mortgaged) return "già ipotecata — niente da vendere";
  if (own.houses > 0) return "prima vendi gli edifici";
  if (def.group && groupTiles(def.group).some((t) => (s.props[t]?.houses ?? 0) > 0)) return "il gruppo ha edifici";
  delete s.props[tile];
  findPlayer(s, pid).cash += def.price! / 2;
  return null;
}

export function unmortgage(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  const p = findPlayer(s, pid);
  if (!own || own.owner !== pid) return "non è tua";
  if (!own.mortgaged) return "non è ipotecata";
  const cost = Math.ceil((def.price! / 2) * 1.1);
  if (p.cash < cost) return "non te lo puoi permettere";
  p.cash -= cost;
  own.mortgaged = false;
  return null;
}
