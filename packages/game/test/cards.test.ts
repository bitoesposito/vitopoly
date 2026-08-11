import { describe, expect, it } from "vitest";
import { drawCard } from "../src/core/movement";
import { CHANCE, CHEST } from "../src/data/cards";
import { walkTiles } from "../src/data/tiles";
import { byId } from "../src/core/players";
import { started } from "./helpers";
import { checkInvariants } from "./invariants";
import type { GameEvent, GameState } from "../src/types";

// Ogni effetto carta, uno per uno e in modo deterministico: si trucca il mazzo e si pesca.

/** Pesca la carta `id` da `deck` per il giocatore corrente. Ritorna stato ed eventi. */
function draw(s: GameState, deck: "chance" | "chest", id: number): { s: GameState; ev: GameEvent[] } {
  s.decks[deck] = [id];
  const ev: GameEvent[] = [];
  drawCard(s, s.players[s.current], deck, false, ev);
  checkInvariants(s);
  return { s, ev };
}

/** L'indice della prima carta del mazzo con quell'effetto: gli id non vanno cablati. */
const cardWith = (deck: readonly { fx: { k: string } }[], k: string) => deck.findIndex((c) => c.fx.k === k);

const cash = (s: GameState, pid: string) => byId(s, pid).cash;

describe("effetti delle carte", () => {
  it("goto: avanza e incassa il VIA se lo passa", () => {
    const s = started();
    s.players[0].pos = 10;
    const before = cash(s, "a");
    draw(s, "chance", cardWith(CHANCE, "goto")); // CHANCE[0] = torna al VIA
    expect(s.players[0].pos).toBe(0);
    expect(cash(s, "a")).toBe(before + 200);
  });

  it("goto in avanti senza passare dal VIA non paga", () => {
    const s = started();
    s.players[0].pos = 0;
    const id = CHANCE.findIndex((c) => c.fx.k === "goto" && c.fx.tile === 24); // vai a Roma
    const before = cash(s, "a");
    draw(s, "chance", id);
    expect(s.players[0].pos).toBe(24);
    expect(cash(s, "a")).toBe(before); // Roma è libera -> buyPrompt, nessun esborso
    expect(s.phase.t).toBe("buyPrompt");
  });

  it("gotoNearest: la prima del tipo giusto DOPO di te, altrimenti si riavvolge", () => {
    const s = started();
    s.players[0].pos = 6;
    draw(
      s,
      "chance",
      CHANCE.findIndex((c) => c.fx.k === "gotoNearest" && c.fx.kind === "railroad")
    );
    expect(s.players[0].pos).toBe(15); // partecipate: 5, 15, 25, 35

    const wrap = started();
    wrap.players[0].pos = 36; // oltre l'ultima
    draw(
      wrap,
      "chance",
      CHANCE.findIndex((c) => c.fx.k === "gotoNearest" && c.fx.kind === "railroad")
    );
    expect(wrap.players[0].pos).toBe(5); // si riavvolge sulla prima
    expect(cash(wrap, "a")).toBe(1500 + 200); // e passando dal VIA incassa
  });

  it("back: torna indietro senza incassare il VIA", () => {
    const s = started();
    s.players[0].pos = 1; // indietro di 3 -> 38 (Mazzetta, tassa 100)
    draw(s, "chance", cardWith(CHANCE, "back"));
    expect(s.players[0].pos).toBe(38);
    expect(cash(s, "a")).toBe(1500 - 100); // tassa pagata, nessuno stipendio
  });

  it("back: l'evento dice che si cammina a ritroso, e sono 3 passi non 37", () => {
    const s = started();
    s.players[0].pos = 1;
    const { ev } = draw(s, "chance", cardWith(CHANCE, "back"));
    const moved = ev.find((e) => e.e === "moved") as Extract<GameEvent, { e: "moved" }>;
    expect(moved.back).toBe(true);
    expect(walkTiles(moved.from, moved.to, moved.back)).toEqual([1, 0, 39, 38]);
    expect(walkTiles(moved.from, moved.to)).toHaveLength(38);
  });

  it("collect / pay: cassa contro banca", () => {
    const c = started();
    draw(
      c,
      "chance",
      CHANCE.findIndex((x) => x.fx.k === "collect" && x.fx.amount === 50)
    );
    expect(cash(c, "a")).toBe(1550);

    const p = started();
    draw(
      p,
      "chance",
      CHANCE.findIndex((x) => x.fx.k === "pay" && x.fx.amount === 15)
    );
    expect(cash(p, "a")).toBe(1485);
  });

  it("pay senza contanti apre un debito invece di andare in negativo", () => {
    const s = started();
    s.players[0].cash = 5;
    const { ev } = draw(
      s,
      "chance",
      CHANCE.findIndex((x) => x.fx.k === "pay" && x.fx.amount === 15)
    );
    expect(cash(s, "a")).toBe(5); // non toccata
    expect(s.stack.at(-1)).toMatchObject({ t: "debt", debtor: "a" });
    expect(ev.some((e) => e.e === "paid")).toBe(false);
  });

  it("payEach: un claim per ogni altro giocatore vivo", () => {
    const s = started();
    const { ev } = draw(s, "chance", cardWith(CHANCE, "payEach")); // €50 a testa, 2 giocatori
    expect(cash(s, "a")).toBe(1450);
    expect(cash(s, "b")).toBe(1550);
    expect(s.stack).toHaveLength(0); // pagato per intero: nessun debito
    expect(ev.filter((e) => e.e === "paid")).toHaveLength(1);
  });

  it("payEach a corto: paga chi può, il resto resta in coda nel debito", () => {
    const s = started();
    s.players[0].cash = 20;
    draw(s, "chance", cardWith(CHANCE, "payEach"));
    const top = s.stack.at(-1);
    expect(top).toMatchObject({ t: "debt", debtor: "a" });
    if (top?.t !== "debt") return;
    expect(top.claims).toEqual([{ creditor: "b", amount: 50 }]);
    expect(cash(s, "a")).toBe(20);
  });

  it("collectEach: ogni altro giocatore paga TE, e l'insolvente ha il suo debito", () => {
    const s = started();
    s.players[1].cash = 3; // Bob non arriva a 10
    draw(s, "chest", cardWith(CHEST, "collectEach"));
    expect(cash(s, "b")).toBe(3);
    // il debito è di Bob verso Alice, non di Alice
    expect(s.stack.at(-1)).toMatchObject({ t: "debt", debtor: "b", claims: [{ creditor: "a", amount: 10 }] });
    expect(cash(s, "a")).toBe(1500); // ancora non incassato
  });

  it("jailCard: una carta in più, cumulabile", () => {
    const s = started();
    const id = cardWith(CHANCE, "jailCard");
    draw(s, "chance", id);
    expect(s.players[0].jailCards).toBe(1);
    draw(s, "chance", id);
    expect(s.players[0].jailCards).toBe(2);
  });

  it("gotoJail: in cella, il movimento finisce lì", () => {
    const s = started();
    s.players[0].pos = 30;
    s.players[0].doublesCount = 2;
    draw(s, "chance", cardWith(CHANCE, "gotoJail"));
    expect(s.players[0]).toMatchObject({ pos: 10, inJail: true, jailTurns: 0, doublesCount: 0 });
    expect(s.phase).toEqual({ t: "postRoll", again: false }); // niente altro tiro
  });

  it("repairs: si paga per casa e per hotel, e nulla se non hai costruito", () => {
    const s = started();
    s.props[1] = { owner: "a", mortgaged: false, houses: 3 };
    s.props[3] = { owner: "a", mortgaged: false, houses: 5 };
    s.props[6] = { owner: "b", mortgaged: false, houses: 4 }; // non tua: non conta
    s.bank = { houses: 32 - 7, hotels: 12 - 1 }; // gli edifici escono dalla banca (invariante)
    draw(s, "chance", cardWith(CHANCE, "repairs")); // €25 a casa, €100 a hotel
    expect(cash(s, "a")).toBe(1500 - (3 * 25 + 100));

    const nothing = started();
    const { ev } = draw(nothing, "chance", cardWith(CHANCE, "repairs"));
    expect(cash(nothing, "a")).toBe(1500);
    expect(ev.some((e) => e.e === "paid")).toBe(false); // zero addebiti, non un addebito da zero
  });

  it("ogni effetto dichiarato nei mazzi ha un caso qui sopra", () => {
    const declared = new Set([...CHANCE, ...CHEST].map((c) => c.fx.k));
    const covered = new Set(["goto", "gotoNearest", "back", "collect", "pay", "payEach", "collectEach", "jailCard", "gotoJail", "repairs"]);
    expect([...declared].filter((k) => !covered.has(k))).toEqual([]);
  });
});
