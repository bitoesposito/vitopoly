import { describe, expect, it } from "vitest";
import { apply } from "../src/engine";
import { advance } from "../src/core/movement";
import { addPlayer, createGame } from "../src/setup";
import { started } from "./helpers";
import type { Player } from "../src/types";

describe("lobby", () => {
  it("needs 2+ players to start", () => {
    const s = createGame(1);
    addPlayer(s, "a", "Alice");
    expect(apply(s, "a", { type: "start" }).ok).toBe(false);
  });

  it("starts into preRoll for player 0", () => {
    const s = started();
    expect(s.status).toBe("playing");
    expect(s.phase.t).toBe("preRoll");
    expect(s.current).toBe(0);
  });
});

describe("uscire dalla stanza", () => {
  it("in lobby il posto torna libero: nessun fantasma a occupare un inchiostro", () => {
    const s = createGame(1);
    addPlayer(s, "a", "Alice");
    addPlayer(s, "b", "Bob");
    const r = apply(s, "b", { type: "leave" });
    expect(r.ok && r.state.players.map((p) => p.id)).toEqual(["a"]);
    expect(apply(s, "spettatore", { type: "leave" }).ok).toBe(false);
  });

  it("in partita è il ritiro volontario, non un'uscita silenziosa", () => {
    const s = started();
    s.props[1] = { owner: "b", mortgaged: false, houses: 0 };
    const r = apply(s, "b", { type: "leave" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players.find((p) => p.id === "b")!.bankrupt).toBe(true);
    expect(r.state.players).toHaveLength(2); // il posto resta nel roster: la partita lo racconta
  });
});

describe("rivincita", () => {
  const ended = () => {
    const s = started();
    s.status = "ended";
    s.winner = "a";
    s.players[1].bankrupt = true;
    s.players[0].cash = 4200;
    s.players[0].pos = 24;
    s.players[0].jailCards = 1;
    s.props[1] = { owner: "a", mortgaged: true, houses: 0 };
    s.vacationPot = 300;
    return s;
  };

  it("riporta in lobby gli stessi giocatori, tabellone azzerato", () => {
    const before = ended();
    const r = apply(before, "a", { type: "rematch" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.state;
    expect(s.status).toBe("lobby");
    expect(s.players.map((p) => [p.id, p.name, p.token])).toEqual(before.players.map((p) => [p.id, p.name, p.token]));
    expect(s.players.every((p) => !p.bankrupt && p.pos === 0 && p.jailCards === 0)).toBe(true);
    expect(s.props).toEqual({});
    expect(s.vacationPot).toBe(0);
    expect(s.winner).toBeUndefined();
    expect(s.log).toEqual([]); // il registro della partita vecchia non si trascina
    expect(s.bank).toEqual({ houses: 32, hotels: 12 });
    // e la partita nuova riparte davvero: start è di nuovo legale
    expect(apply(s, "a", { type: "start" }).ok).toBe(true);
  });

  it("solo chi era al tavolo, e solo a partita finita", () => {
    expect(apply(ended(), "spettatore", { type: "rematch" }).ok).toBe(false);
    expect(apply(ended(), "a", { type: "roll" }).ok).toBe(false); // niente altro passa
    expect(apply(started(), "a", { type: "rematch" }).ok).toBe(false); // non a partita in corso
  });
});

describe("roll -> postRoll", () => {
  it("moves the current player and advances rng", () => {
    const s = started();
    const before = s.players[0].pos;
    const r = apply(s, "a", { type: "roll" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.seed).not.toBe(s.seed); // dice consumed rng
    const moved = (r.state.players[0].pos - before + 40) % 40;
    expect(moved).toBeGreaterThanOrEqual(2);
    expect(moved).toBeLessThanOrEqual(12);
    // postRoll normally; buyPrompt if we landed on an unowned property; preRoll never (jail = postRoll)
    expect(["postRoll", "buyPrompt"]).toContain(r.state.phase.t);
    expect(r.events[0].e).toBe("rolled");
  });

  it("rejects a roll from the wrong player", () => {
    const s = started();
    expect(apply(s, "b", { type: "roll" }).ok).toBe(false);
  });

  it("endTurn passes to the next player (no doubles)", () => {
    let s = started();
    // roll until we get a non-doubles turn, then endTurn should advance current
    const r = apply(s, "a", { type: "roll" });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    if (s.phase.t === "postRoll" && !s.phase.again) {
      const e = apply(s, "a", { type: "endTurn" });
      expect(e.ok).toBe(true);
      if (e.ok) expect(e.state.current).toBe(1);
    }
  });
});

describe("GO salary (advance unit)", () => {
  it("pays 200 when passing GO", () => {
    const p: Player = {
      id: "a",
      name: "A",
      token: 0,
      cash: 1500,
      pos: 39,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      doublesCount: 0,
      bankrupt: false,
      connected: true,
    };
    advance(p, 3); // 39 -> 2, wraps past GO
    expect(p.pos).toBe(2);
    expect(p.cash).toBe(1700);
  });

  it("does not pay when not passing GO", () => {
    const p: Player = {
      id: "a",
      name: "A",
      token: 0,
      cash: 1500,
      pos: 5,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      doublesCount: 0,
      bankrupt: false,
      connected: true,
    };
    advance(p, 4); // 5 -> 9
    expect(p.pos).toBe(9);
    expect(p.cash).toBe(1500);
  });
});
