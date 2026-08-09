import { describe, expect, it } from "vitest";
import { apply, legalActions } from "../src/engine";
import { activeNode } from "../src/core/nodes";
import { addPlayer, createGame } from "../src/setup";
import { checkInvariants } from "./invariants";
import { nextInt } from "../src/rng";
import type { ClientAction, GameState } from "../src/types";

// Partite casuali ma per lo più legali, con gli invarianti dopo OGNI passo accettato.
// È il rilevatore di corruzione trasversale più economico che abbiamo: becca le fughe di
// frame che nessun test scritto a mano immagina.

/** Chi la macchina sta effettivamente aspettando. Scegliere a caso fra tutti i vivi
 *  faceva agire il giocatore sbagliato 3 volte su 4, e il soak testava solo i rifiuti. */
function whoIsExpected(s: GameState, rng: { seed: number }): string {
  const node = activeNode(s);
  if (node.t === "debt") return node.debtor;
  if (node.t === "auction") {
    const bidders = node.active.filter((p) => p !== node.leader);
    if (bidders.length) return bidders[nextInt(rng, bidders.length)];
  }
  return s.players[s.current].id;
}

function randomAction(s: GameState, rng: { seed: number }): { pid: string; a: ClientAction } {
  const alive = s.players.filter((p) => !p.bankrupt);
  // 1 su 5 agisce un giocatore a caso: i rifiuti restano coperti, ma smettono di essere tutto
  const pid = nextInt(rng, 5) === 0 ? alive[nextInt(rng, alive.length)].id : whoIsExpected(s, rng);
  const types = legalActions(s, pid);
  const type = types[nextInt(rng, types.length)];
  // le caselle si pescano fra le PROPRIE: un tile a caso su 40 era quasi sempre un rifiuto
  const mine = Object.keys(s.props).map(Number).filter((t) => s.props[t]!.owner === pid);
  const tile = mine.length ? mine[nextInt(rng, mine.length)] : nextInt(rng, 40);
  switch (type) {
    case "bid":
      return { pid, a: { type, amount: 1 + nextInt(rng, 200) } };
    case "build":
    case "sellHouse":
    case "mortgage":
    case "unmortgage":
    case "sellProperty":
      return { pid, a: { type, tile } };
    default:
      return { pid, a: { type } as ClientAction };
  }
}

function playOut(seed: number, steps: number) {
  const rng = { seed };
  const s0 = createGame(seed * 7 + 1);
  for (const n of ["a", "b", "c", "d"]) addPlayer(s0, n, n.toUpperCase());
  const start = apply(s0, "a", { type: "start" });
  if (!start.ok) throw new Error(start.error);
  let s = start.state;

  let applied = 0;
  let rejected = 0;
  let rolls = 0;
  for (let i = 0; i < steps && s.status === "playing"; i++) {
    const { pid, a } = randomAction(s, rng);
    const r = apply(s, pid, a);
    if (!r.ok) {
      rejected++;
      continue;
    }
    checkInvariants(r.state);
    rolls += r.events.filter((e) => e.e === "rolled").length;
    s = r.state;
    applied++;
  }
  return { s, applied, rejected, rolls };
}

describe("soak", () => {
  // Le soglie sono tarate sui minimi MISURATI (422 azioni, 66 tiri per partita) con un
  // margine largo. Non sono decorative: prima di essere alzate il soak applicava 66 azioni
  // su 2000 e passava lo stesso. Se un'azione nuova le fa scendere, è il picker che va
  // sistemato — o è un blocco vero, che è esattamente ciò che questo test deve trovare.
  it.each([1, 2, 3, 4, 5])("partita %i: 2000 azioni non corrompono mai lo stato", (seed) => {
    const { s, applied, rejected, rolls } = playOut(seed, 2000);
    expect(s.status === "ended" || applied > 300).toBe(true);
    expect(s.status === "ended" || rolls > 40).toBe(true);
    expect(rejected).toBeGreaterThan(0); // i rifiuti restano esercitati
  });

  // La bancarotta è l'unico percorso che chiude davvero la macchina: se questo smette di
  // finire, c'è uno stato senza uscita da qualche parte. Il seme è fissato perché la
  // partita chiuda in fretta (~6600 passi) — la varietà la danno i cinque casi sopra.
  it("una partita arriva alla fine e produce un vincitore", () => {
    const { s } = playOut(1, 30_000);
    expect(s.status).toBe("ended");
    expect(s.players.filter((p) => !p.bankrupt)).toHaveLength(1);
    expect(s.winner).toBe(s.players.find((p) => !p.bankrupt)!.id);
  });
});
