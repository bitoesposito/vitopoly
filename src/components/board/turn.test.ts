import { describe, expect, it } from "vitest";
import { addPlayer, apply, createGame } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { turnView } from "./turn";

// turnView è la derivazione da cui dipendono SIA i testi del centro SIA i bottoni della
// barra pollice. Se sbaglia, l'interfaccia mostra un'azione che il motore rifiuterà.

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

describe("turnView", () => {
  it("preRoll: chi ha il turno può tirare, l'altro no", () => {
    const g = game();
    const mine = turnView(g, "a");
    expect(mine.isMyTurn).toBe(true);
    expect(mine.canRoll).toBe(true);
    expect(mine.current?.id).toBe("a");

    const theirs = turnView(g, "b");
    expect(theirs.isMyTurn).toBe(false);
    expect(theirs.canRoll).toBe(false);
  });

  it("uno spettatore non ha turno, né me, né azioni", () => {
    const v = turnView(game(), "chi-guarda");
    expect(v.isMyTurn).toBe(false);
    expect(v.me).toBeUndefined();
    expect(v.canRoll).toBe(false);
    expect(v.buyTile).toBeNull();
  });

  it("buyPrompt: la casella è tua da comprare solo se è il tuo turno", () => {
    const g = game();
    g.phase = { t: "buyPrompt", tile: 39, again: false }; // Milano, €400
    expect(turnView(g, "a").buyTile).toBe(39);
    expect(turnView(g, "b").buyTile).toBeNull(); // è l'acquisto di un altro
  });

  it("shortfall dice quanto manca, e zero quando te la puoi permettere", () => {
    const g = game();
    g.phase = { t: "buyPrompt", tile: 39, again: false };
    expect(turnView(g, "a").shortfall).toBe(0); // 1500 > 400

    g.players[0].cash = 120;
    expect(turnView(g, "a").shortfall).toBe(280);
  });

  it("debito: chi deve lo vede come proprio, gli altri come altrui", () => {
    const g = game();
    g.stack.push({
      t: "debt",
      debtor: "a",
      claims: [
        { creditor: "b", amount: 200 },
        { creditor: "bank", amount: 50 },
      ],
    });

    const debtor = turnView(g, "a");
    expect(debtor.iOwe).toBe(true);
    expect(debtor.owed).toBe(250); // la somma di TUTTI i claim in coda
    expect(debtor.creditors).toBe("Bob, banca");

    const other = turnView(g, "b");
    expect(other.debt).not.toBeNull();
    expect(other.iOwe).toBe(false);
  });

  it("creditori duplicati compaiono una volta sola", () => {
    const g = game();
    g.stack.push({
      t: "debt",
      debtor: "a",
      claims: [
        { creditor: "bank", amount: 10 },
        { creditor: "bank", amount: 20 },
      ],
    });
    expect(turnView(g, "a").creditors).toBe("banca");
    expect(turnView(g, "a").owed).toBe(30);
  });

  it("in asta non si tira, chiunque tu sia", () => {
    const g = game();
    g.stack.push({ t: "auction", tile: 1, queue: [], bid: 0, leader: null, active: ["a", "b"], bids: [] });
    expect(turnView(g, "a").canRoll).toBe(false);
    expect(turnView(g, "a").node.t).toBe("auction");
  });

  it("doppio: si può ritirare da postRoll, ma non con un interrupt aperto", () => {
    const g = game();
    g.phase = { t: "postRoll", again: true };
    expect(turnView(g, "a").again).toBe(true);
    expect(turnView(g, "a").canRoll).toBe(true);

    g.stack.push({ t: "debt", debtor: "a", claims: [{ creditor: "bank", amount: 10 }] });
    expect(turnView(g, "a").again).toBe(false); // prima si salda
    expect(turnView(g, "a").canRoll).toBe(false);
  });

  it("le azioni legali sono quelle del motore, non una lista riscritta", () => {
    const g = game();
    expect(turnView(g, "a").legal.has("roll")).toBe(true);
    expect(turnView(g, "a").legal.has("endTurn")).toBe(false); // non hai ancora tirato
    expect(turnView(g, "b").legal.has("mortgage")).toBe(true); // il patrimonio è tuo a qualunque ora
    expect(turnView(g, "b").legal.has("roll")).toBe(true); // la lista è del NODO, chi può agire lo dice il motore
  });
});
