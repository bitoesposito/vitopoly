import type { GameEvent, GameState } from "../types";
import { BAIL } from "../data/tiles";
import { roll2d6 } from "../rng";
import { moveAndResolve, sendToJail } from "../core/movement";
import { charge, transfer } from "../core/money";
import { alive, cur, nextPlayer } from "../core/players";
import { err, info, ok, type Handler } from "../core/result";

// Il turno: tirare, uscire di prigione, chiudere. Tutto ciò che il giocatore di turno
// fa per far avanzare la macchina.

export const roll: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  const [d1, d2] = roll2d6(s);
  const ev: GameEvent[] = [{ e: "rolled", pid, d1, d2 }];
  const doubles = d1 === d2;

  if (p.inJail) {
    if (doubles) {
      p.inJail = false;
      p.jailTurns = 0;
      ev.push(info(`${p.name} fa doppio ed esce di prigione`));
      moveAndResolve(s, p, d1 + d2, false, ev); // il doppio d'uscita NON dà un altro tiro
    } else if (++p.jailTurns >= 3) {
      // terzo tentativo fallito: cauzione forzata. PRIMA muovi, POI addebita — un frame
      // di debito aperto prima del movimento perderebbe il "e poi muoviti" che segue.
      p.inJail = false;
      p.jailTurns = 0;
      ev.push(info(`${p.name} paga la cauzione dopo 3 tentativi falliti`));
      moveAndResolve(s, p, d1 + d2, false, ev);
      charge(s, pid, [{ creditor: "bank", amount: BAIL }], "bail", ev);
    } else {
      ev.push(info(`${p.name} resta in prigione (${p.jailTurns}/3)`));
      s.phase = { t: "postRoll", again: false };
    }
    return ok(s, ev);
  }

  if (doubles && ++p.doublesCount === 3) {
    sendToJail(s, p, ev); // tre doppi di fila: l'evento jailed racconta tutto
    return ok(s, ev);
  }
  moveAndResolve(s, p, d1 + d2, doubles, ev);
  return ok(s, ev);
};

/** Doppio: si ritira direttamente da postRoll, senza passare da endTurn. */
export const rollAgain: Handler = (s, pid, a) => {
  const ph = s.phase;
  if (ph.t !== "postRoll" || !ph.again) return err("hai già tirato");
  if (cur(s).id !== pid) return err("non è il tuo turno");
  s.phase = { t: "preRoll" };
  return roll(s, pid, a);
};

export const payBail: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  if (!p.inJail) return err("non sei in prigione");
  if (p.cash < BAIL) return err("non puoi permetterti la cauzione");
  const ev: GameEvent[] = [];
  transfer(s, pid, "bank", BAIL, "bail", ev);
  p.inJail = false;
  p.jailTurns = 0;
  return ok(s, ev); // resta preRoll: adesso si tira normalmente
};

export const useJailCard: Handler = (s, pid) => {
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  if (!p.inJail) return err("non sei in prigione");
  if (p.jailCards < 1) return err("nessuna carta prigione");
  p.jailCards--;
  p.inJail = false;
  p.jailTurns = 0;
  return ok(s, [info(`${p.name} usa una carta Esci gratis di prigione`)]);
};

export const endTurn: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "postRoll") return err("non puoi finire il turno ora");
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  if (ph.again && !p.inJail) {
    s.phase = { t: "preRoll" };
    return ok(s);
  }
  p.doublesCount = 0;
  return ok(advanceTurn(s));
};

function advanceTurn(s: GameState): GameState {
  const rest = alive(s);
  if (rest.length <= 1) {
    s.status = "ended";
    s.winner = rest[0]?.id;
    return s;
  }
  nextPlayer(s);
  return s;
}
