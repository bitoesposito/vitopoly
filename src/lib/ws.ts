import type { ClientAction, ServerMsg } from "@tangentopoly/game";
import { useGame } from "./store";

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

export function send(action: ClientAction): void {
  socket?.send(JSON.stringify({ type: "action", action }));
}

export function sendChat(text: string): void {
  socket?.send(JSON.stringify({ type: "chat", text }));
}
