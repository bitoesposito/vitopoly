import type { ClientAction, GameState, PlayerId, Result } from "../types";
import { CHANCE, CHEST } from "../data/cards";
import { err, info, ok } from "../core/result";
import { nextInt } from "../rng";
import { addPlayer, createGame, MAX_NAME, TOKENS } from "../setup";

// Prima del fischio d'inizio: nome, inchiostro, avvio. Il regolamento è fisso —
// updateSettings è stata tolta dal protocollo, non solo dalla UI.

/** Permutazione di [0..n) con il seed dello stato: ordine di turno e mazzi replicabili. */
function shuffled(s: GameState, n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = nextInt(s, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function lobby(s: GameState, pid: PlayerId, a: ClientAction): Result {
  if (a.type === "profile") return profile(s, pid, a);
  if (a.type !== "start") return err("partita non iniziata");
  if (s.players[0]?.id !== pid) return err("solo l'host può iniziare");
  if (s.players.length < 2) return err("servono almeno 2 giocatori");

  s.status = "playing";
  if (s.settings.randomOrder) s.players = shuffled(s, s.players.length).map((i) => s.players[i]);
  for (const p of s.players) p.cash = s.settings.startingCash;
  s.current = 0;
  s.phase = { t: "preRoll" };
  s.decks = { chance: shuffled(s, CHANCE.length), chest: shuffled(s, CHEST.length) };
  return ok(s, [info("partita iniziata")]);
}

/** Lascio il tavolo prima che inizi: il posto torna libero davvero, altrimenti resterebbe
 *  un giocatore fantasma a occupare un inchiostro e a contare per l'avvio. In partita non
 *  passa da qui — lì lasciare è il ritiro volontario, che ha le sue conseguenze. */
export function leaveLobby(s: GameState, pid: PlayerId): Result {
  const i = s.players.findIndex((p) => p.id === pid);
  if (i < 0) return err("non sei in partita");
  const [via] = s.players.splice(i, 1);
  return ok(s, [info(`${via.name} lascia il tavolo`)]);
}

/** Rivincita: si torna in sala d'attesa con gli stessi giocatori. Non un reset a mano dei
 *  campi ma una partita nuova in cui si risiedono i posti, così un campo aggiunto domani a
 *  GameState nasce pulito qui come alla prima apertura della stanza. */
export function rematch(s: GameState, pid: PlayerId): Result {
  if (!s.players.some((p) => p.id === pid)) return err("non sei in partita");
  const fresh = createGame(s.seed); // stesso seed: la sequenza dei dadi continua, non si ripete
  for (const old of s.players) {
    const p = addPlayer(fresh, old.id, old.name)!; // c'entrava prima, c'entra adesso
    p.token = old.token;
    p.connected = old.connected;
  }
  return ok(fresh, [info("nuova partita: stessi giocatori")]);
}

function profile(s: GameState, pid: PlayerId, a: Extract<ClientAction, { type: "profile" }>): Result {
  const me = s.players.find((p) => p.id === pid);
  if (!me) return err("non sei in partita");
  if (a.name !== undefined) {
    const name = a.name.trim().slice(0, MAX_NAME);
    if (!name) return err("il nome non può essere vuoto");
    if (s.players.some((p) => p.id !== pid && p.name.trim().toLowerCase() === name.toLowerCase())) return err("quel nome è già preso");
    me.name = name;
  }
  if (a.token !== undefined) {
    if (!Number.isInteger(a.token) || a.token < 0 || a.token >= TOKENS) return err("colore non valido");
    if (s.players.some((p) => p.id !== pid && p.token === a.token)) return err("quel colore è già preso");
    me.token = a.token;
  }
  return ok(s);
}
