import type { AuctionFrame, GameEvent, GameState, Result } from "../types";
import { settleAuction } from "../core/auction";
import { cash } from "../core/players";
import { clone, err, ok, type Handler } from "../core/result";

// Offrire e ritirarsi. L'apertura e l'aggiudicazione stanno in core/auction.ts.

/** L'asta è finita quando non resta nessuno, o quando l'unico rimasto è chi è in testa.
 *  Va controllata dopo OGNI cambio di `active` o di `leader`: se tutti passano prima che
 *  qualcuno offra, resta un solo attivo senza leader — e nel momento in cui quello offre
 *  diventa l'unico attivo E il leader. Senza questo controllo anche dopo `bid`, quello
 *  stato non ha più nessuna azione legale e la partita si ferma fino al timer. */
const isSettled = (f: AuctionFrame) => f.active.length === 0 || (f.leader !== null && f.active.every((x) => x === f.leader));

/** `amount` è un INCREMENTO sull'offerta corrente: due quick-bid simultanei atterrano
 *  entrambi, in ordine, invece di annullarsi a vicenda. */
export const bid: Handler = (s, pid, a) => {
  if (a.type !== "bid") return err("azione non valida");
  const f = s.stack.at(-1) as AuctionFrame;
  if (!f.active.includes(pid)) return err("non sei in questa asta");
  if (f.leader === pid) return err("sei già in testa");
  if (!Number.isInteger(a.amount) || a.amount <= 0) return err("offerta non valida");
  const total = f.bid + a.amount;
  if (total > cash(s, pid)) return err("non puoi offrire più dei tuoi contanti"); // in asta non nasce mai un debito
  f.bid = total;
  f.leader = pid;
  f.bids.push({ pid, amount: total }); // lo storico del pannello basta: niente riga di log
  const ev: GameEvent[] = [];
  if (isSettled(f)) settleAuction(s, f, ev); // ha offerto l'ultimo rimasto: aggiudicata
  return ok(s, ev);
};

export const fold: Handler = (s, pid) => {
  const f = s.stack.at(-1) as AuctionFrame;
  if (!f.active.includes(pid)) return err("non sei in questa asta");
  if (f.leader === pid) return err("il miglior offerente non può ritirarsi");
  f.active = f.active.filter((x) => x !== pid);
  const ev: GameEvent[] = [];
  if (isSettled(f)) settleAuction(s, f, ev);
  return ok(s, ev);
};

/** Scadenza del timer: aggiudica al leader (o a nessuno). Non è una ClientAction —
 *  se lo fosse, un client potrebbe chiudere l'asta quando gli conviene. */
export function auctionTimeout(state: GameState): Result {
  if (state.stack.at(-1)?.t !== "auction") return err("nessuna asta");
  const s = clone(state);
  const ev: GameEvent[] = [];
  settleAuction(s, s.stack.at(-1) as AuctionFrame, ev);
  return ok(s, ev);
}
