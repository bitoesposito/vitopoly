import type { GameEvent } from "../types";
import { BOARD } from "../data/tiles";
import { pushAuction } from "../core/auction";
import { transfer } from "../core/money";
import { cur } from "../core/players";
import { err, ok, type Handler } from "../core/result";

// La casella libera su cui sei fermo: la compri o la lasci.

export const buy: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "buyPrompt") return err("nessun acquisto in corso");
  const p = cur(s);
  if (p.id !== pid) return err("non è il tuo turno");
  const price = BOARD[ph.tile].price!;
  if (p.cash < price) return err("non te lo puoi permettere");
  const ev: GameEvent[] = [];
  transfer(s, pid, "bank", price, `buy ${BOARD[ph.tile].name}`, ev);
  s.props[ph.tile] = { owner: pid, mortgaged: false, houses: 0 };
  s.phase = { t: "postRoll", again: ph.again };
  return ok(s, ev);
};

export const decline: Handler = (s, pid) => {
  const ph = s.phase;
  if (ph.t !== "buyPrompt") return err("nessun acquisto in corso");
  if (cur(s).id !== pid) return err("non è il tuo turno");
  s.phase = { t: "postRoll", again: ph.again }; // PRIMA il punto di ripresa, poi l'interrupt sopra
  if (s.settings.auction) pushAuction(s, ph.tile, []); // il pannello asta che compare È la notifica
  return ok(s);
};
