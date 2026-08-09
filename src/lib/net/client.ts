import { toast } from "sonner";
import type { ClientAction, ServerMsg } from "@tangentopoly/game";
import { useGame } from "../store";
import { rememberSeat, seatSecret } from "../seat";
import { choreograph } from "./choreography";

// Il trasporto e basta: apri la stanza, tieni viva la socket, versa i messaggi nello
// store. Come i messaggi diventano animazione lo decide choreography.ts.

const HTTP_BASE = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";
const WS_BASE = HTTP_BASE.replace(/^http/, "ws");

let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

export async function createRoom(): Promise<string> {
  const r = await fetch(`${HTTP_BASE}/api/room`, { method: "POST" });
  const { code } = (await r.json()) as { code: string };
  return code;
}

export function connect(code: string, name: string): void {
  const { myId } = useGame.getState();
  localStorage.setItem("tangentopoly:name", name);
  useGame.setState({ error: null }); // "stanza piena" e simili da un tentativo precedente
  clearTimeout(retryTimer);
  if (socket) {
    socket.onclose = null; // chiusura voluta: non far ripartire il retry della vecchia socket
    socket.close();
  }
  // Il segreto del posto, coniato dal server alla prima entrata: senza, chiunque legga
  // il tuo pid nello stato pubblico potrebbe rientrare come te. Uno per stanza.
  const token = seatSecret(code);
  socket = new WebSocket(`${WS_BASE}/api/room/${code}/ws?pid=${myId}&token=${token}&name=${encodeURIComponent(name)}`);

  socket.onopen = () => {
    useGame.setState({ connected: true, code, name, retries: 0 });
    history.replaceState(null, "", `?room=${code}`); // senza questo l'host che ricarica perde la stanza
  };
  socket.onclose = (e) => {
    useGame.setState({ connected: false });
    if (e.code === 4000) return; // respinto (stanza piena / partita iniziata)
    // reset del DO, deploy, rete ballerina: lo stato è persistito, si riprova con backoff.
    // Il conteggio sta SOLO nello store: è lo stesso numero che il banner mostra, e
    // tenerne una seconda copia qui significava allinearli a mano su tre righe.
    const attempt = useGame.getState().retries;
    useGame.setState({ retries: attempt + 1 });
    retryTimer = setTimeout(() => connect(code, name), Math.min(1000 * 2 ** attempt, 10_000));
  };
  socket.onmessage = (ev) => receive(JSON.parse(ev.data) as ServerMsg, code);
}

function receive(msg: ServerMsg, code: string): void {
  const store = useGame.getState();
  switch (msg.type) {
    case "seat":
      rememberSeat(code, msg.token);
      return;
    case "state":
      useGame.setState({ game: msg.state, error: null }); // sostituzione integrale: niente merge, niente fold
      store.pushEvents(msg.events);
      choreograph(msg.state, msg.events);
      return;
    case "chat":
      store.pushChat(msg.msg);
      return;
    case "chatHistory":
      useGame.setState({ chat: msg.msgs });
      return;
    case "error":
      // toast per gli errori d'azione; `error` resta per gli stati bloccanti (lobby)
      toast.error(msg.error);
      useGame.setState({ error: msg.error });
      return;
  }
}

export function send(action: ClientAction): void {
  useGame.setState({ error: null }); // l'errore muore all'azione dell'utente, non al prossimo stato
  socket?.send(JSON.stringify({ type: "action", action }));
}

export function sendChat(text: string): void {
  socket?.send(JSON.stringify({ type: "chat", text }));
}
