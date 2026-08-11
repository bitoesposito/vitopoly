import { describe, expect, it } from "vitest";
import { addPlayer, apply, createGame } from "@tangentopoly/game";
import type { GameEvent, PublicState } from "@tangentopoly/game";
import { auctionLive, isMyTurn, lastRoll, netWorth, ownedTiles, playerNames } from "./selectors";

/** Una partita avviata, ridotta a stato pubblico: è quello che il client vede davvero. */
function game(): PublicState {
  const s = createGame(42);
  addPlayer(s, "a", "Alice");
  addPlayer(s, "b", "Bob");
  const r = apply(s, "a", { type: "start" });
  if (!r.ok) throw new Error(r.error);
  // l'ordine di turno è sorteggiato: qui si asserisce su "a", quindi lo si rimette in fila
  r.state.players.sort((x, y) => x.id.localeCompare(y.id));
  return r.state;
}

describe("selettori", () => {
  it("playerNames mappa id -> nome", () => {
    expect(playerNames(game())).toEqual({ a: "Alice", b: "Bob" });
  });

  it("ownedTiles restituisce solo le tue, come numeri", () => {
    const g = game();
    g.props[1] = { owner: "a", mortgaged: false, houses: 0 };
    g.props[3] = { owner: "b", mortgaged: false, houses: 0 };
    g.props[6] = { owner: "a", mortgaged: true, houses: 0 };
    expect(ownedTiles(g, "a")).toEqual([1, 6]);
    expect(ownedTiles(g, "b")).toEqual([3]);
    expect(ownedTiles(g, "nessuno")).toEqual([]);
  });

  it("isMyTurn segue l'indice di turno", () => {
    const g = game();
    expect(isMyTurn(g, "a")).toBe(true);
    expect(isMyTurn(g, "b")).toBe(false);
    expect(isMyTurn(g, "spettatore")).toBe(false);
  });

  it("auctionLive vede l'asta ovunque sia nello stack, non solo in cima", () => {
    const g = game();
    expect(auctionLive(g)).toBe(false);
    g.stack.push({ t: "auction", tile: 1, queue: [], bid: 0, leader: null, active: ["a"], bids: [] });
    expect(auctionLive(g)).toBe(true);
    g.stack.push({ t: "debt", debtor: "a", claims: [{ creditor: "bank", amount: 10 }] });
    expect(auctionLive(g)).toBe(true); // sepolta sotto un debito, ma sempre in corso
  });

  it("lastRoll prende l'ultimo tiro, non il primo, e ne porta l'identità", () => {
    expect(lastRoll([], [])).toBeNull();
    expect(lastRoll([], [{ e: "info", text: "niente dadi" }])).toBeNull();
    const eventi: GameEvent[] = [
      { e: "rolled", pid: "a", d1: 1, d2: 2 },
      { e: "moved", pid: "a", from: 0, to: 3 },
      { e: "rolled", pid: "b", d1: 6, d2: 6 },
    ];
    // dal registro di sessione: `spin` è il seq del tiro, così i dadi ruzzolano una volta sola
    expect(
      lastRoll(
        eventi.map((ev, seq) => ({ seq, ev })),
        []
      )
    ).toMatchObject({ pid: "b", d1: 6, d2: 6, spin: 2 });
    // chi entra a metà turno legge lo stato: facce sì, lancio no
    expect(lastRoll([], eventi)).toMatchObject({ pid: "b", d1: 6, d2: 6, spin: 0 });
  });
});

describe("netWorth = quanto incasseresti liquidando adesso", () => {
  it("solo contante quando non possiedi niente", () => {
    expect(netWorth(game(), "a")).toBe(1500);
  });

  it("un titolo vale il prezzo di SVENDITA, non il prezzo di listino", () => {
    const g = game();
    g.props[39] = { owner: "a", mortgaged: false, houses: 0 }; // Milano, €400
    expect(netWorth(g, "a")).toBe(1500 + 250); // 200 di ipoteca × 1,25, non 400
  });

  it("un titolo ipotecato vale il solo plusvalore residuo", () => {
    const g = game();
    g.props[39] = { owner: "a", mortgaged: true, houses: 0 };
    expect(netWorth(g, "a")).toBe(1500 + 50); // metà prezzo già incassata, resta il 25%
  });

  it("gli edifici valgono metà del loro costo", () => {
    const g = game();
    g.props[39] = { owner: "a", mortgaged: false, houses: 3 }; // casa €200
    expect(netWorth(g, "a")).toBe(1500 + 250 + 3 * 100);
  });

  it("le proprietà altrui non contano", () => {
    const g = game();
    g.props[39] = { owner: "b", mortgaged: false, houses: 5 };
    expect(netWorth(g, "a")).toBe(1500);
  });

  it("ipoteca poi svendita rende esattamente quanto la svendita secca", () => {
    const g = game();
    g.props[39] = { owner: "a", mortgaged: false, houses: 0 };
    const secca = netWorth(g, "a");
    // ipotecare sposta valore dal titolo alla cassa, ma il totale non cambia
    g.players[0].cash += 200;
    g.props[39]!.mortgaged = true;
    expect(netWorth(g, "a")).toBe(secca);
  });
});
