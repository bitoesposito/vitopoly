import type { GameState, PlayerId, TileId } from "../types";
import { BOARD, groupTiles } from "../data/tiles";

// Le regole sulle proprietà, e SOLO qui. Ogni operazione ha due facce:
//   whyNot<Op>(view, pid, tile) -> motivo in italiano, o null se si può
//   <op>(state, pid, tile)      -> esegue, o restituisce lo stesso motivo
// Il client chiama i predicati per spegnere i bottoni con la ragione giusta, il motore
// li chiama prima di mutare. Nessuna regola è scritta due volte.

/** La vista minima che serve ai predicati: la stessa che ha il client (PublicState). */
export type RulesView = Pick<GameState, "props" | "players" | "settings" | "bank">;

const owner = (s: RulesView, pid: PlayerId) => s.players.find((p) => p.id === pid);

// ---- valori ----------------------------------------------------------

/** Riscatto di un'ipoteca: metà prezzo più il 10%. */
export const unmortgageCost = (tile: TileId) => Math.ceil((BOARD[tile].price! / 2) * 1.1);

/** Svendita alla banca: il 25% in più dell'ipoteca. Se il titolo è già ipotecato il
 *  giocatore ha incassato metà prezzo: gli resta solo quel plusvalore. I prezzi del
 *  tabellone sono pari, quindi ipoteca + plusvalore = vendita piena, al centesimo. */
export const sellValue = (tile: TileId, mortgaged: boolean) =>
  Math.round((BOARD[tile].price! / 2) * (mortgaged ? 0.25 : 1.25));

// ---- predicati -------------------------------------------------------

export function whyNotBuild(s: RulesView, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (def.kind !== "street" || !own || own.owner !== pid) return "non è una tua strada";
  if (own.mortgaged) return "è ipotecata";
  if (own.houses >= 5) return "c'è già un hotel";
  const group = groupTiles(def.group!);
  if (!group.every((t) => s.props[t]?.owner === pid)) return "serve l'intero gruppo di colore";
  if (group.some((t) => s.props[t]!.mortgaged)) return "il gruppo ha strade ipotecate";
  if ((owner(s, pid)?.cash ?? 0) < def.houseCost!) return "non te lo puoi permettere";
  const toHotel = own.houses === 4;
  if (toHotel && s.bank.hotels < 1) return "la banca ha finito gli hotel";
  if (!toHotel && s.bank.houses < 1) return "la banca ha finito le case";
  return null;
}

export function whyNotSellHouse(s: RulesView, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (def.kind !== "street" || !own || own.owner !== pid) return "non è una tua strada";
  if (own.houses === 0) return "niente da vendere";
  return null;
}

export function whyNotMortgage(s: RulesView, pid: PlayerId, tile: TileId): string | null {
  if (!s.settings.mortgageAllowed) return "ipoteche disabilitate in questa partita";
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (own.mortgaged) return "già ipotecata";
  if (def.group && groupTiles(def.group).some((t) => (s.props[t]?.houses ?? 0) > 0)) return "il gruppo ha edifici";
  return null;
}

export function whyNotUnmortgage(s: RulesView, pid: PlayerId, tile: TileId): string | null {
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (!own.mortgaged) return "non è ipotecata";
  if ((owner(s, pid)?.cash ?? 0) < unmortgageCost(tile)) return "non te lo puoi permettere";
  return null;
}

export function whyNotSellProperty(s: RulesView, pid: PlayerId, tile: TileId): string | null {
  const def = BOARD[tile];
  const own = s.props[tile];
  if (!own || own.owner !== pid) return "non è tua";
  if (own.houses > 0) return "prima vendi gli edifici";
  if (def.group && groupTiles(def.group).some((t) => (s.props[t]?.houses ?? 0) > 0)) return "il gruppo ha edifici";
  return null;
}

// ---- operazioni ------------------------------------------------------

export function build(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = whyNotBuild(s, pid, tile);
  if (no) return no;
  const def = BOARD[tile];
  const own = s.props[tile]!;
  owner(s, pid)!.cash -= def.houseCost!;
  if (own.houses === 4) {
    s.bank.hotels--;
    s.bank.houses += 4; // le 4 case tornano alla banca
  } else {
    s.bank.houses--;
  }
  own.houses++;
  return null;
}

export function sellHouse(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = whyNotSellHouse(s, pid, tile);
  if (no) return no;
  const half = BOARD[tile].houseCost! / 2;
  const own = s.props[tile]!;
  const p = owner(s, pid)!;
  if (own.houses < 5) {
    s.bank.houses++;
    own.houses--;
    p.cash += half;
    return null;
  }
  s.bank.hotels++;
  if (s.bank.houses >= 4) {
    s.bank.houses -= 4; // hotel -> 4 case
    own.houses = 4;
    p.cash += half;
  } else {
    // penuria di edifici: l'hotel si vende in blocco (deviazione documentata)
    own.houses = 0;
    p.cash += half * 5;
  }
  return null;
}

export function mortgage(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = whyNotMortgage(s, pid, tile);
  if (no) return no;
  s.props[tile]!.mortgaged = true;
  owner(s, pid)!.cash += BOARD[tile].price! / 2;
  return null;
}

export function unmortgage(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = whyNotUnmortgage(s, pid, tile);
  if (no) return no;
  s.props[tile]!.mortgaged = false;
  owner(s, pid)!.cash -= unmortgageCost(tile);
  return null;
}

/** Il titolo torna alla banca (e ridiventa comprabile): svendere non è tenere. */
export function sellProperty(s: GameState, pid: PlayerId, tile: TileId): string | null {
  const no = whyNotSellProperty(s, pid, tile);
  if (no) return no;
  const gain = sellValue(tile, s.props[tile]!.mortgaged);
  delete s.props[tile];
  owner(s, pid)!.cash += gain;
  return null;
}
