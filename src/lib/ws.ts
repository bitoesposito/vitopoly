import { toast } from "sonner";
import { BOARD, CHANCE, CHEST, JAIL } from "@tangentopoly/game";
import type { ClientAction, GameEvent, PublicState, ServerMsg } from "@tangentopoly/game";
import { walkMs } from "./utils";
import { useGame, type PopupInput } from "./store";

const HTTP_BASE = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";
const WS_BASE = HTTP_BASE.replace(/^http/, "ws");

let socket: WebSocket | null = null;
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

export async function createRoom(): Promise<string> {
  const r = await fetch(`${HTTP_BASE}/api/room`, { method: "POST" });
  const { code } = (await r.json()) as { code: string };
  return code;
}

export function connect(code: string, name: string): void {
  const { myId } = useGame.getState();
  localStorage.setItem("tangentopoly:name", name);
  useGame.setState({ error: null }); // stale "room is full" etc. from a previous attempt
  clearTimeout(retryTimer);
  if (socket) {
    socket.onclose = null; // deliberate close: don't trigger the old socket's retry
    socket.close();
  }
  const url = `${WS_BASE}/api/room/${code}/ws?pid=${myId}&name=${encodeURIComponent(name)}`;
  socket = new WebSocket(url);
  socket.onopen = () => {
    retries = 0;
    useGame.setState({ connected: true, code, name, retries: 0 });
    // senza questo l'host che ricarica perde la stanza (Lobby legge ?room=)
    history.replaceState(null, "", `?room=${code}`);
  };
  socket.onclose = (e) => {
    useGame.setState({ connected: false });
    if (e.code === 4000) return; // rejected (room full / game started)
    // DO reset, deploy, flaky network: state is persisted, reconnect with backoff
    useGame.setState({ retries: retries + 1 });
    retryTimer = setTimeout(() => connect(code, name), Math.min(1000 * 2 ** retries++, 10_000));
  };
  socket.onmessage = (ev) => {
    const msg = JSON.parse(ev.data) as ServerMsg;
    switch (msg.type) {
      case "state":
        useGame.setState({ game: msg.state, error: null }); // wholesale replace — no merging, no folding
        useGame.getState().pushEvents(msg.events);
        choreograph(msg.state, msg.events);
        break;
      case "chat":
        useGame.getState().pushChat(msg.msg);
        break;
      case "chatHistory":
        useGame.setState({ chat: msg.msgs });
        break;
      case "error":
        // toast per gli errori d'azione; `error` resta per gli stati bloccanti (lobby)
        toast.error(msg.error);
        useGame.setState({ error: msg.error });
        break;
    }
  };
}

// Una tab in background accumula i setTimeout e li spara tutti al ritorno: al
// rientro li buttiamo e saltiamo alla fine (la correttezza è già di `at(t)`).
let pending: ReturnType<typeof setTimeout>[] = [];

function flush(): void {
  for (const id of pending) clearTimeout(id);
  pending = [];
  const g = useGame.getState();
  for (const p of g.game?.players ?? []) g.setTokenPos(p.id, p.pos);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => document.hidden && flush());
}

// The state lands with FINAL positions; the events carry the story. Replay it on a
// timeline instead of all at once: the token walks to the tile, the card pops, THEN
// the jail move — with pauses long enough to read the board, short enough not to block.
// Exported: /dev la usa per provare la sequenza con eventi sintetici.
export function choreograph(state: PublicState, events: GameEvent[]): void {
  const name = (pid: string) => state.players.find((p) => p.id === pid)?.name ?? "?";
  // già in background: niente timeline
  const skip = typeof document !== "undefined" && document.hidden;
  const at = (ms: number, fn: () => void) =>
    ms <= 0 || skip ? fn() : void pending.push(setTimeout(fn, ms));
  const pop = (ms: number, p: PopupInput) => at(ms, () => useGame.getState().pushPopups([p]));
  let t = 0;
  for (const e of events) {
    switch (e.e) {
      case "moved": {
        const { pid, to, from } = e;
        at(t, () => useGame.getState().setTokenPos(pid, to));
        t += walkMs((to - from + 40) % 40) + 250; // arrive, breathe, then whatever the tile does
        break;
      }
      case "card":
        pop(t, { kind: e.deck, name: name(e.pid), text: (e.deck === "chance" ? CHANCE : CHEST)[e.cardId].text });
        t += 1100; // let the card land before the next beat (e.g. "go to jail")
        break;
      case "jailed": {
        const pid = e.pid;
        pop(t, { kind: "jailed", name: name(pid), you: pid === useGame.getState().myId });
        at(t + 350, () => useGame.getState().setTokenPos(pid, JAIL));
        t += 800;
        break;
      }
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
          const tile = BOARD.findIndex((x) => x.name === e.why.slice(4)); // why = `buy ${BOARD[tile].name}` (engine)
          if (tile >= 0) pop(t, { kind: "buy", name: name(e.from), tile, price: e.amount });
          t += 500;
        }
        break;
    }
  }
  // safety net: when the timeline ends, display positions = authoritative positions
  at(t, () => {
    const g = useGame.getState();
    for (const p of g.game?.players ?? []) g.setTokenPos(p.id, p.pos);
  });
}

export function send(action: ClientAction): void {
  useGame.setState({ error: null }); // l'errore muore all'azione dell'utente, non al prossimo stato
  socket?.send(JSON.stringify({ type: "action", action }));
}

export function sendChat(text: string): void {
  socket?.send(JSON.stringify({ type: "chat", text }));
}
