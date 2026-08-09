import type { DebtFrame, GameEvent, GameState, PlayerId, Result } from "../types";
import { expropriate, seizeToBank } from "../core/estate";
import { transfer } from "../core/money";
import { cash } from "../core/players";
import { err, info, ok, type Handler } from "../core/result";

// Il frame di debito: si paga finché si riesce, oppure si esce.

export const payDebt: Handler = (s, pid) => {
  const f = s.stack.at(-1) as DebtFrame;
  if (f.debtor !== pid) return err("non è il tuo debito");
  const ev: GameEvent[] = [];
  while (f.claims.length > 0 && cash(s, pid) >= f.claims[0].amount) {
    const c = f.claims.shift()!;
    transfer(s, pid, c.creditor, c.amount, "debt", ev);
  }
  // pagamento parziale: lo stato è comunque avanzato, quindi si salva
  if (f.claims.length > 0) return ev.length ? ok(s, ev) : err("contanti insufficienti — vendi, ipoteca, scambia o dichiara bancarotta");
  s.stack.pop(); // ripresa: parla quello che sta sotto
  return ok(s, ev);
};

/** Bancarotta CON un debito aperto: i creditori vengono pagati sul ricavato. */
export const bankrupt: Handler = (s, pid) => {
  const f = s.stack.at(-1) as DebtFrame;
  if (f.debtor !== pid) return err("non è il tuo debito");
  const ev: GameEvent[] = [];
  s.stack.pop();
  if (f.claims.every((c) => c.creditor === "bank")) seizeToBank(s, pid, ev);
  else expropriate(s, pid, f.claims, ev);
  return ok(s, ev);
};

/** Ritiro volontario, in qualunque momento: tutto alla banca e i titoli all'asta.
 *  Vive fuori dalla tabella degli handler perché non dipende dal nodo attivo. */
export function quitGame(s: GameState, pid: PlayerId): Result {
  const p = s.players.find((x) => x.id === pid);
  if (!p || p.bankrupt) return err("non sei in partita");
  if (s.stack.some((f) => f.t === "auction")) return err("aspetta la fine dell'asta"); // un leader morto corromperebbe l'asta
  if (s.stack.some((f) => f.t === "debt" && f.debtor === pid)) return err("prima risolvi il tuo debito");
  const ev: GameEvent[] = [info(`${p.name} dichiara bancarotta`)];
  seizeToBank(s, pid, ev);
  return ok(s, ev);
}
