import type { GameEvent, GameState, PlayerId, Result } from "../types";
import { seizeToBank } from "../core/estate";
import { alive } from "../core/players";
import { err, info, ok } from "../core/result";

// Regione ortogonale, come gli scambi: l'unanimità degli altri vivi espelle un assente.
// Il suo patrimonio cade alla banca e torna all'asta.
export function votekick(s: GameState, pid: PlayerId, target: PlayerId): Result {
  const voter = s.players.find((p) => p.id === pid);
  const victim = s.players.find((p) => p.id === target);
  if (!voter || voter.bankrupt) return err("non sei in partita");
  if (!victim || victim.bankrupt) return err("giocatore inesistente");
  if (pid === target) return err("non puoi espellere te stesso");
  if (s.stack.some((f) => f.t === "auction")) return err("aspetta la fine dell'asta"); // espellere un leader corromperebbe l'asta
  const others = alive(s).filter((p) => p.id !== target);
  if (others.length < 2 && victim.connected) return err("non puoi espellere un giocatore presente in 1v1"); // sarebbe vittoria istantanea

  const votes = new Set(s.kickVotes[target] ?? []);
  votes.add(pid);
  s.kickVotes[target] = [...votes];
  const ev: GameEvent[] = [info(`${voter.name} vota per espellere ${victim.name} (${votes.size}/${others.length})`)];
  if (votes.size < others.length) return ok(s, ev);

  // unanimità: annulla ogni debito a carico del bersaglio (un debitore morto bloccherebbe la macchina)
  s.stack = s.stack.filter((f) => !(f.t === "debt" && f.debtor === target));
  ev.push(info(`${victim.name} è stato espulso`));
  seizeToBank(s, target, ev);
  return ok(s, ev);
}
