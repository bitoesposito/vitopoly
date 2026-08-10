import { BOARD, CHANCE, CHEST, JAIL, walkTiles } from "@tangentopoly/game";
import type { GameEvent, PublicState } from "@tangentopoly/game";
import { walkMs } from "../board-layout";
import { useGame, type PopupInput } from "../store";

// Lo stato arriva con le posizioni FINALI; sono gli eventi a raccontare la storia.
// Qui la si rigioca su una linea del tempo invece che tutta insieme: la pedina cammina
// fino alla casella, la carta esce, POI si va in prigione — con pause abbastanza lunghe
// da leggere il tabellone e abbastanza corte da non bloccare.

// Una tab in background accumula i setTimeout e li spara tutti al ritorno: al rientro
// li buttiamo e saltiamo alla fine (la correttezza è già nello stato autoritativo).
let pending: ReturnType<typeof setTimeout>[] = [];

function syncTokens(): void {
  const g = useGame.getState();
  for (const p of g.game?.players ?? []) g.setTokenStep(p.id, { pos: p.pos });
}

function flush(): void {
  for (const id of pending) clearTimeout(id);
  pending = [];
  syncTokens();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => document.hidden && flush());
}

/** Esportata anche per /dev, che la prova con eventi sintetici. */
export function choreograph(state: PublicState, events: GameEvent[]): void {
  const name = (pid: string) => state.players.find((p) => p.id === pid)?.name ?? "?";
  const skip = typeof document !== "undefined" && document.hidden; // già in background: niente timeline
  const at = (ms: number, fn: () => void) => (ms <= 0 || skip ? fn() : void pending.push(setTimeout(fn, ms)));
  const pop = (ms: number, p: PopupInput) => at(ms, () => useGame.getState().pushPopups([p]));

  let t = 0;
  for (const e of events) {
    switch (e.e) {
      case "moved":
        at(t, () => useGame.getState().setTokenStep(e.pid, { pos: e.to, back: e.back }));
        // stessa camminata della pedina, o l'attesa non copre l'animazione
        t += walkMs(walkTiles(e.from, e.to, e.back).length - 1) + 250; // arriva, respira, poi la casella fa il suo
        break;
      case "card":
        pop(t, { kind: e.deck, name: name(e.pid), text: (e.deck === "chance" ? CHANCE : CHEST)[e.cardId].text });
        t += 1100; // la carta atterra prima del battito successivo (es. "vai in prigione")
        break;
      case "jailed":
        pop(t, { kind: "jailed", name: name(e.pid), you: e.pid === useGame.getState().myId });
        at(t + 350, () => useGame.getState().setTokenStep(e.pid, { pos: JAIL }));
        t += 800;
        break;
      case "auctionWon":
        pop(t, { kind: "buy", name: name(e.pid), tile: e.tile, price: e.price });
        t += 500;
        break;
      case "traded":
        pop(t, { kind: "trade", from: name(e.from), to: name(e.to), give: e.give, get: e.get });
        t += 500;
        break;
      case "paid":
        if (e.from !== "bank" && e.to === "bank" && e.why.startsWith("buy ")) {
          const tile = BOARD.findIndex((x) => x.name === e.why.slice(4)); // why = `buy ${BOARD[tile].name}`
          if (tile >= 0) pop(t, { kind: "buy", name: name(e.from), tile, price: e.amount });
          t += 500;
        }
        break;
    }
  }
  at(t, syncTokens); // rete di sicurezza: a fine timeline le posizioni mostrate = quelle vere
}
