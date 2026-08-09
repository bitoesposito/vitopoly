import type { GameEvent, GameState, Player, PlayerId } from "../types";
import { BOARD, GO_SALARY, JAIL, TILES, stepsBack, stepsTo } from "../data/tiles";
import { CHANCE, CHEST } from "../data/cards";
import { landing } from "../rules/landing";
import { charge, transfer } from "./money";
import { alive } from "./players";

// Muovi → atterra → (eventualmente) pesca. Le tre cose stanno insieme perché sono
// mutuamente ricorsive: una carta "vai a Roma" rientra in moveAndResolve, che può
// ripescare. Separarle creerebbe solo un ciclo di import travestito da modulo.

/** Avanza di `steps`, incassando lo stipendio del VIA al passaggio. Muta il giocatore. */
export function advance(p: Player, steps: number): { from: number; to: number; passedGo: boolean } {
  const from = p.pos;
  p.pos = (from + steps) % TILES;
  const passedGo = p.pos < from || steps >= TILES;
  if (passedGo) p.cash += GO_SALARY;
  return { from, to: p.pos, passedGo };
}

export function sendToJail(s: GameState, p: Player, ev: GameEvent[]): void {
  p.pos = JAIL;
  p.inJail = true;
  p.jailTurns = 0;
  p.doublesCount = 0;
  s.phase = { t: "postRoll", again: false }; // la prigione chiude il movimento; il turno finisce con endTurn
  ev.push({ e: "jailed", pid: p.id });
}

/** Movimento + risoluzione dell'atterraggio. Fissa PRIMA il punto di ripresa (postRoll),
 *  poi può parcheggiare la macchina su buyPrompt o impilare un debito sopra. */
export function moveAndResolve(s: GameState, p: Player, steps: number, again: boolean, ev: GameEvent[]): void {
  s.phase = { t: "postRoll", again };
  const { from, to, passedGo } = advance(p, steps);
  ev.push({ e: "moved", pid: p.id, from, to });
  if (passedGo) ev.push({ e: "paid", from: "bank", to: p.id, amount: GO_SALARY, why: "GO salary" });
  resolveLanding(s, p, steps, again, ev);
}

function resolveLanding(s: GameState, p: Player, diceTotal: number, again: boolean, ev: GameEvent[]): void {
  const out = landing(s, p, diceTotal);
  switch (out.t) {
    case "none":
      return;
    case "offerBuy":
      s.phase = { t: "buyPrompt", tile: out.tile, again };
      return;
    case "charge":
      charge(s, p.id, [{ creditor: out.to as PlayerId | "bank", amount: out.amount }], out.why, ev);
      return;
    case "card":
      drawCard(s, p, out.deck, again, ev);
      return;
    case "goToJail":
      sendToJail(s, p, ev);
      return;
    case "vacation":
      if (s.settings.vacationCash && s.vacationPot > 0) {
        transfer(s, "bank", p.id, s.vacationPot, "vacation cash", ev);
        s.vacationPot = 0;
      }
      return;
  }
}

/** Pesca dal mazzo e applica l'effetto. La carta torna in fondo: le carte prigione
 *  si duplicano così, ed è accettato. */
export function drawCard(s: GameState, p: Player, deck: "chance" | "chest", again: boolean, ev: GameEvent[]): void {
  const pile = s.decks[deck];
  const id = pile.shift()!;
  pile.push(id);
  const card = (deck === "chance" ? CHANCE : CHEST)[id];
  ev.push({ e: "card", pid: p.id, deck, cardId: id }); // la UI disegna questo: niente riga di log doppia

  const fx = card.fx;
  switch (fx.k) {
    case "goto":
      moveAndResolve(s, p, stepsTo(p.pos, fx.tile), again, ev);
      return;
    case "gotoNearest": {
      const spots = BOARD.flatMap((t, i) => (t.kind === fx.kind ? [i] : []));
      const target = spots.find((i) => i > p.pos) ?? spots[0];
      moveAndResolve(s, p, stepsTo(p.pos, target), again, ev);
      return;
    }
    case "back": {
      const from = p.pos;
      p.pos = stepsBack(from, fx.n); // indietro non paga il VIA
      ev.push({ e: "moved", pid: p.id, from, to: p.pos });
      resolveLanding(s, p, fx.n, again, ev); // dado fittizio per il caso raro "concessione"
      return;
    }
    case "collect":
      transfer(s, "bank", p.id, fx.amount, "card", ev);
      return;
    case "pay":
      charge(s, p.id, [{ creditor: "bank", amount: fx.amount }], "card", ev);
      return;
    case "payEach":
      charge(s, p.id, alive(s).filter((x) => x.id !== p.id).map((x) => ({ creditor: x.id, amount: fx.amount })), "card", ev);
      return;
    case "collectEach":
      // ogni altro giocatore deve a p — gli insolventi ricevono il proprio frame di debito
      for (const x of alive(s).filter((x) => x.id !== p.id)) charge(s, x.id, [{ creditor: p.id, amount: fx.amount }], "card", ev);
      return;
    case "jailCard":
      p.jailCards++;
      return;
    case "gotoJail":
      sendToJail(s, p, ev);
      return;
    case "repairs": {
      const total = Object.values(s.props).reduce((sum, own) => {
        if (!own || own.owner !== p.id) return sum;
        return sum + (own.houses === 5 ? fx.hotel : own.houses * fx.house);
      }, 0);
      if (total > 0) charge(s, p.id, [{ creditor: "bank", amount: total }], "repairs", ev);
      return;
    }
  }
}
