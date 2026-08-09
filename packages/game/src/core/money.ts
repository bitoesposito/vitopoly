import type { Claim, GameEvent, GameState, PlayerId } from "../types";
import { byId, cash } from "./players";

// Ogni euro che cambia mano passa da qui. Due sole funzioni: una che sposta e basta,
// una che prova a farlo e apre un debito se non ci riesce.

// Gli acquisti non alimentano il malloppo; tasse, carte, riparazioni, cauzione e
// debiti verso la banca sì.
const NO_POT = new Set(["auction", "bankruptcy", "trade"]);

export function transfer(s: GameState, from: PlayerId | "bank", to: PlayerId | "bank", amount: number, why: string, ev: GameEvent[]): void {
  if (from !== "bank") byId(s, from).cash -= amount;
  if (to !== "bank") byId(s, to).cash += amount;
  if (to === "bank" && s.settings.vacationCash && !NO_POT.has(why) && !why.startsWith("buy ")) s.vacationPot += amount;
  ev.push({ e: "paid", from, to, amount, why });
}

/** Ogni pagamento DOVUTO da un giocatore passa di qui. Contanti insufficienti non è un
 *  errore: è uno stato, e diventa un frame di debito in cima allo stack. */
export function charge(s: GameState, debtor: PlayerId, claims: Claim[], why: string, ev: GameEvent[]): void {
  const rest: Claim[] = [];
  for (const c of claims) {
    if (rest.length === 0 && cash(s, debtor) >= c.amount) transfer(s, debtor, c.creditor, c.amount, why, ev);
    else rest.push(c);
  }
  if (rest.length > 0) s.stack.push({ t: "debt", debtor, claims: rest });
}
