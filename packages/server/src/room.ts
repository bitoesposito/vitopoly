import { DurableObject } from "cloudflare:workers";
import { activeNode, addPlayer, apply, auctionTimeout, createGame, redact, setConnected, timeoutAction, timeoutMs } from "@tangentopoly/game";
import type { ChatMsg, ClientMsg, GameEvent, GameState, Result, ServerMsg } from "@tangentopoly/game";
import type { Env } from "./index";

function seed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
}

// One room = one Durable Object. State is a single JSON blob under key "game".
export class RoomDO extends DurableObject<Env> {
  private game!: GameState;
  private chat!: ChatMsg[];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Runs before any fetch/message, including after a hibernation wake — nothing to rehydrate but the blobs.
    ctx.blockConcurrencyWhile(async () => {
      this.game = (await ctx.storage.get<GameState>("game")) ?? createGame(seed());
      this.game.kickVotes ??= {}; // blobs persisted before votekick existed
      this.chat = (await ctx.storage.get<ChatMsg[]>("chat")) ?? [];
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // debug escape hatch: raw state dump (pre-launch tooling, remove before real users)
    if (url.pathname.endsWith("/debug")) return Response.json(this.game);

    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const pid = url.searchParams.get("pid");
    const name = (url.searchParams.get("name") || "Player").slice(0, 20);
    if (!pid) return new Response("missing pid", { status: 400 });

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ pid }); // survives hibernation — the trust boundary

    const joined = addPlayer(this.game, pid, name); // no-op if already joined (reconnect)
    if (!joined) {
      this.send(server, { type: "error", error: this.game.status === "lobby" ? "room is full" : "game already started" });
      server.close(4000, "cannot join");
      return new Response(null, { status: 101, webSocket: client });
    }
    setConnected(this.game, pid, true);
    this.send(server, { type: "chatHistory", msgs: this.chat });
    await this.persistAndBroadcast();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const { pid } = ws.deserializeAttachment() as { pid: string };
    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMsg;
    } catch {
      return this.send(ws, { type: "error", error: "bad json" });
    }
    if (msg?.type === "chat") {
      const text = String(msg.text ?? "").slice(0, 300).trim();
      const name = this.game.players.find((p) => p.id === pid)?.name ?? "?";
      if (!text) return;
      const m: ChatMsg = { pid, name, text, ts: Date.now() };
      this.chat = [...this.chat, m].slice(-100);
      await this.ctx.storage.put("chat", this.chat);
      const payload = JSON.stringify({ type: "chat", msg: m } satisfies ServerMsg);
      for (const s of this.ctx.getWebSockets()) {
        try {
          s.send(payload);
        } catch {
          /* closing */
        }
      }
      return;
    }
    if (!msg || msg.type !== "action") return this.send(ws, { type: "error", error: "unknown message" });

    const r = apply(this.game, pid, msg.action);
    if (!r.ok) return this.send(ws, { type: "error", error: r.error });
    await this.commit(r, ws);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const { pid } = ws.deserializeAttachment() as { pid: string };
    setConnected(this.game, pid, false);
    await this.persistAndBroadcast();
  }

  // Timer: fires when the current wait-node's deadline passes; applies the default action.
  async alarm(): Promise<void> {
    if (this.game.status !== "playing" || !this.game.deadline) return;
    if (Date.now() < this.game.deadline - 1000) {
      // an action moved the deadline after this alarm was queued — re-arm
      await this.ctx.storage.setAlarm(this.game.deadline);
      return;
    }
    let r: Result;
    if (activeNode(this.game).t === "auction") {
      r = auctionTimeout(this.game); // timer expiry settles to the leader (or nobody)
    } else {
      const t = timeoutAction(this.game);
      if (!t) return;
      r = apply(this.game, t.pid, t.action);
      if (!r.ok && activeNode(this.game).t === "debt") r = apply(this.game, t.pid, { type: "bankrupt" }); // can't pay -> out
    }
    if (!r.ok) return; // no auto-action possible; leave the room to humans (debug endpoint shows why)
    r.events.push({ e: "info", text: "⏰ time's up — auto action" });
    await this.commit(r);
  }

  // Single commit path: cap log, persist, broadcast, re-arm the timer.
  private async commit(r: Extract<Result, { ok: true }>, from?: WebSocket): Promise<void> {
    if (!invariantsOk(r.state)) {
      if (from) this.send(from, { type: "error", error: "invariant violation (not persisted)" });
      return;
    }
    r.state.log = [...r.state.log, ...r.events].slice(-100);
    this.game = r.state;
    await this.persistAndBroadcast(r.events);
  }

  private async persistAndBroadcast(events: GameEvent[] = []): Promise<void> {
    if (this.game.status === "playing") {
      this.game.deadline = Date.now() + timeoutMs(this.game);
      await this.ctx.storage.setAlarm(this.game.deadline);
    } else {
      this.game.deadline = undefined;
      await this.ctx.storage.deleteAlarm();
    }
    await this.ctx.storage.put("game", this.game);
    const s = JSON.stringify({ type: "state", state: redact(this.game), events } satisfies ServerMsg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(s);
      } catch {
        /* socket closing */
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMsg): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket closing */
    }
  }
}

function invariantsOk(s: GameState): boolean {
  if (s.status === "playing" && (s.current < 0 || s.current >= s.players.length || s.players[s.current].bankrupt)) return false;
  if (s.players.some((p) => p.cash < 0)) return false;
  const houses = Object.values(s.props).reduce((n, o) => n + (o!.houses === 5 ? 0 : o!.houses), 0);
  if (houses + s.bank.houses !== 32) return false;
  return true;
}
