import { CHANCE, CHEST } from "@tangentopoly/game";
import type { ClientAction, GameEvent, PublicState, ServerMsg } from "@tangentopoly/game";
import { toast } from "@/components/ui/sonner";
import { useGame } from "./store";
import { translate } from "./i18n";

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
  clearTimeout(retryTimer);
  if (socket) {
    socket.onclose = null; // deliberate close: don't trigger the old socket's retry
    socket.close();
  }
  const url = `${WS_BASE}/api/room/${code}/ws?pid=${myId}&name=${encodeURIComponent(name)}`;
  socket = new WebSocket(url);
  socket.onopen = () => {
    retries = 0;
    useGame.setState({ connected: true, code, name });
  };
  socket.onclose = (e) => {
    useGame.setState({ connected: false });
    if (e.code === 4000) return; // rejected (room full / game started)
    // DO reset, deploy, flaky network: state is persisted, reconnect with backoff
    retryTimer = setTimeout(() => connect(code, name), Math.min(1000 * 2 ** retries++, 10_000));
  };
  socket.onmessage = (ev) => {
    const msg = JSON.parse(ev.data) as ServerMsg;
    switch (msg.type) {
      case "state":
        useGame.setState({ game: msg.state, error: null }); // wholesale replace — no merging, no folding
        useGame.getState().pushEvents(msg.events);
        notifyEvents(msg.state, msg.events);
        break;
      case "chat":
        useGame.getState().pushChat(msg.msg);
        break;
      case "chatHistory":
        useGame.setState({ chat: msg.msgs });
        break;
      case "error":
        useGame.setState({ error: msg.error });
        break;
    }
  };
}

// toast the notable events: drawn cards and jail
function notifyEvents(state: PublicState, events: GameEvent[]): void {
  const { lang } = useGame.getState();
  const name = (pid: string) => state.players.find((p) => p.id === pid)?.name ?? "?";
  for (const e of events) {
    if (e.e === "card") toast(translate(lang, "ev.card", { name: name(e.pid), text: (e.deck === "chance" ? CHANCE : CHEST)[e.cardId].text }));
    else if (e.e === "jailed") toast(translate(lang, "ev.jailed", { name: name(e.pid) }));
  }
}

export function send(action: ClientAction): void {
  socket?.send(JSON.stringify({ type: "action", action }));
}

export function sendChat(text: string): void {
  socket?.send(JSON.stringify({ type: "chat", text }));
}
