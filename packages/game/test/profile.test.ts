import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { addPlayer, createGame, freeName, freeToken, TOKENS } from "../src/setup";

const lobby = () => {
  const s = createGame(7);
  addPlayer(s, "a", "Vito");
  addPlayer(s, "b", "Anna");
  return s;
};

describe("identità in lobby", () => {
  it("all'ingresso nomi doppi vengono disambiguati e gli inchiostri non si ripetono", () => {
    const s = lobby();
    addPlayer(s, "c", "Vito");
    addPlayer(s, "d", " vito ");
    // il maiuscolo scritto dal giocatore si conserva: disambiguiamo, non riscriviamo
    expect(s.players.map((p) => p.name)).toEqual(["Vito", "Anna", "Vito 2", "vito 3"]);
    expect(new Set(s.players.map((p) => p.token)).size).toBe(4);
  });

  it("cambio nome: libero se non è di un altro, rifiutato se lo è", () => {
    const s = lobby();
    const ok = apply(s, "a", { type: "profile", name: "Vituccio" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.state.players[0].name).toBe("Vituccio");
    // confronto senza maiuscole: "anna" è "Anna"
    expect(apply(s, "a", { type: "profile", name: "anna" }).ok).toBe(false);
    expect(apply(s, "a", { type: "profile", name: "   " }).ok).toBe(false);
    // il proprio nome resta valido per sé
    expect(apply(s, "a", { type: "profile", name: "Vito" }).ok).toBe(true);
  });

  it("cambio colore: solo indici validi e solo se libero", () => {
    const s = lobby();
    expect(apply(s, "a", { type: "profile", token: 5 }).ok).toBe(true);
    expect(apply(s, "a", { type: "profile", token: 1 }).ok).toBe(false); // è di Anna
    expect(apply(s, "a", { type: "profile", token: 8 }).ok).toBe(false);
    expect(apply(s, "a", { type: "profile", token: -1 }).ok).toBe(false);
  });

  it("a partita iniziata l'identità non si tocca più", () => {
    const s = lobby();
    const g = apply(s, "a", { type: "start" });
    if (!g.ok) throw new Error(g.error);
    expect(apply(g.state, "a", { type: "profile", name: "Tardivo" }).ok).toBe(false);
  });

  it("freeName/freeToken non collidono mai con gli altri", () => {
    const s = lobby();
    expect(freeName(s, "Anna")).toBe("Anna 2");
    expect(freeName(s, "Anna", "b")).toBe("Anna"); // escludendo sé stessa
    expect(freeToken(s)).toBe(2);
    expect(freeToken(s, "a")).toBe(0);
  });
});

describe("tetto del tavolo", () => {
  // Oltre gli inchiostri disponibili due giocatori avrebbero stesso colore, stessa
  // lettera e stesso scostamento sulla plancia: due pedine sovrapposte e indistinguibili.
  it("dopo TOKENS giocatori non si siede più nessuno", () => {
    const s = createGame(1);
    for (let i = 0; i < TOKENS; i++) expect(addPlayer(s, `p${i}`, `G${i}`)).not.toBeNull();
    expect(s.players).toHaveLength(TOKENS);
    expect(addPlayer(s, "uno-di-troppo", "Tardivo")).toBeNull();
    expect(s.players).toHaveLength(TOKENS);
  });

  it("gli inchiostri assegnati sono tutti diversi", () => {
    const s = createGame(1);
    for (let i = 0; i < TOKENS; i++) addPlayer(s, `p${i}`, `G${i}`);
    expect(new Set(s.players.map((p) => p.token)).size).toBe(TOKENS);
    expect(freeToken(s)).toBe(-1); // pieno: nessun riciclo
  });

  it("un posto liberato torna disponibile", () => {
    const s = createGame(1);
    for (let i = 0; i < TOKENS; i++) addPlayer(s, `p${i}`, `G${i}`);
    s.players.splice(3, 1);
    expect(freeToken(s)).toBe(3);
    const p = addPlayer(s, "nuovo", "Nuovo");
    expect(p?.token).toBe(3);
  });
});
