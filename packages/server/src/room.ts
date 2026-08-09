import { DurableObject } from "cloudflare:workers";
import { activeNode, addPlayer, apply, auctionTimeout, createGame, redact, setConnected, timeoutAction, timeoutMs, invariantViolations, TOKENS } from "@tangentopoly/game";
import type { ChatMsg, ClientMsg, GameEvent, GameState, Result, ServerMsg } from "@tangentopoly/game";
import type { Env } from "./index";

function seed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
}

// Una stanza morta viene cancellata dopo questo silenzio: fine partita, o nessuno collegato.
const CLEANUP_MS = 24 * 60 * 60 * 1000;

// One room = one Durable Object. State is a single JSON blob under key "game".
export class RoomDO extends DurableObject<Env> {
  private game!: GameState;
  private chat!: ChatMsg[];
  // pid -> segreto. Fuori dal blob del gioco: redact() non può perderlo per sbaglio.
  private seats!: Record<string, string>;
  private lastChatAt: Record<string, number> = {};

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Runs before any fetch/message, including after a hibernation wake — nothing to rehydrate but the blobs.
    ctx.blockConcurrencyWhile(async () => {
      this.game = (await ctx.storage.get<GameState>("game")) ?? createGame(seed());
      this.game.kickVotes ??= {}; // blobs persisted before votekick existed
      this.chat = (await ctx.storage.get<ChatMsg[]>("chat")) ?? [];
      this.seats = (await ctx.storage.get<Record<string, string>>("seats")) ?? {};
    });
  }

  // Il posto è di chi ne ha il segreto. Chi arriva con un pid mai visto lo occupa e
  // riceve il segreto; chi arriva con un pid già occupato e il segreto sbagliato non è
  // quel giocatore, e resta spettatore. (Le stanze aperte prima di questo controllo non
  // hanno segreti: il primo che si collega si prende il posto.)
  //
  // Il segreto si conia SOLO a chi può davvero sedersi. Prima lo riceveva ogni pid mai
  // visto, spettatori compresi: una scrittura su storage e una riga di mappa per ogni
  // curioso che apriva il link, senza limite.
  private async claimSeat(pid: string, token: string | null): Promise<string | null> {
    const existing = this.seats[pid];
    if (existing) return existing === token ? existing : null;
    if (this.game.status !== "lobby" || this.game.players.length >= TOKENS) return null;
    const minted = crypto.randomUUID();
    this.seats = { ...this.seats, [pid]: minted };
    await this.ctx.storage.put("seats", this.seats);
    return minted;
  }

  private whySpectator(pid: string): string {
    if (this.seats[pid]) return "questo posto è di un altro giocatore: puoi solo guardare";
    if (this.game.status !== "lobby") return "la partita è già iniziata: puoi solo guardare";
    return `il tavolo è al completo (${TOKENS} giocatori): puoi solo guardare`;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pid = url.searchParams.get("pid");
    const token = url.searchParams.get("token");

    // debug escape hatch: solo per chi ha un posto in questa stanza, e sempre da redact()
    if (url.pathname.endsWith("/debug")) {
      if (!pid || !token || this.seats[pid] !== token) return new Response("non sei di questa stanza", { status: 403 });
      return Response.json(redact(this.game));
    }

    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const name = (url.searchParams.get("name") || "Player").slice(0, 20);
    if (!pid) return new Response("missing pid", { status: 400 });

    const seat = await this.claimSeat(pid, token);
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    // l'attachment sopravvive all'ibernazione: è QUI che il pid diventa affidabile
    server.serializeAttachment({ pid: seat ? pid : `spettatore:${crypto.randomUUID()}`, name });

    this.send(server, { type: "chatHistory", msgs: this.chat });
    const joined = seat ? addPlayer(this.game, pid, name) : null;
    if (seat && joined) {
      this.send(server, { type: "seat", token: seat });
      setConnected(this.game, pid, true);
      await this.persistAndBroadcast();
    } else {
      // spettatore: vede stato e chat. Dirgli PERCHÉ, o il banner "stai guardando" è un muro.
      this.send(server, { type: "error", error: this.whySpectator(pid) });
      this.send(server, { type: "state", state: redact(this.game), events: [] });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // an unhandled exception here resets the DO and drops every socket in the room
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    try {
      await this.handleMessage(ws, raw);
    } catch (e) {
      console.error("webSocketMessage crashed:", e);
      this.send(ws, { type: "error", error: "errore interno" });
    }
  }

  private async handleMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const att = ws.deserializeAttachment() as { pid: string; name?: string };
    const pid = att.pid;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMsg;
    } catch {
      return this.send(ws, { type: "error", error: "messaggio non valido" });
    }
    if (msg?.type === "chat") {
      const text = String(msg.text ?? "").slice(0, 300).trim();
      const name = this.game.players.find((p) => p.id === pid)?.name ?? att.name ?? "?";
      if (!text) return;
      // ogni messaggio è una scrittura su storage: uno al secondo a testa basta e avanza
      const now = Date.now();
      if (now - (this.lastChatAt[pid] ?? 0) < 1000) return;
      this.lastChatAt[pid] = now;
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
    if (!msg || msg.type !== "action") return this.send(ws, { type: "error", error: "messaggio sconosciuto" });
    if (!this.game.players.some((p) => p.id === pid)) return this.send(ws, { type: "error", error: "gli spettatori non possono agire" });

    const r = apply(this.game, pid, msg.action);
    if (!r.ok) return this.send(ws, { type: "error", error: r.error });
    await this.commit(r, ws);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const { pid } = ws.deserializeAttachment() as { pid: string };
    setConnected(this.game, pid, false);
    await this.persistAndBroadcast();
  }

  // una socket che muore male non chiama webSocketClose: senza questo il giocatore
  // resterebbe "collegato" per sempre e la stanza continuerebbe a giocare da sola
  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // Timer: fires when the current wait-node's deadline passes; applies the default action.
  // Same deal as webSocketMessage: a throw would reset the DO, so catch and retry.
  async alarm(): Promise<void> {
    try {
      await this.handleAlarm();
    } catch (e) {
      console.error("alarm crashed:", e);
      await this.ctx.storage.setAlarm(Date.now() + 10_000);
    }
  }

  private async handleAlarm(): Promise<void> {
    // stanza finita o abbandonata: l'unico alarm che resta è quello che la cancella
    if (this.game.status === "ended" || !this.hasLivePlayers()) return void (await this.ctx.storage.deleteAll());
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
    r.events.push({ e: "info", text: "⏰ tempo scaduto — azione automatica" });
    await this.commit(r);
  }

  // Single commit path: cap log, persist, broadcast, re-arm the timer.
  private async commit(r: Extract<Result, { ok: true }>, from?: WebSocket): Promise<void> {
    const broken = invariantViolations(r.state);
    if (broken.length) {
      console.error("invarianti violate, stato non salvato:", broken, JSON.stringify(r.events));
      if (from) this.send(from, { type: "error", error: "errore interno (stato non salvato)" });
      return;
    }
    r.state.log = [...r.state.log, ...r.events].slice(-100);
    this.game = r.state;
    await this.persistAndBroadcast(r.events);
  }

  // C'è ancora qualcuno che sta giocando davvero? Il timer del turno esiste per non far
  // aspettare gli altri: senza nessuno collegato non ha nessuno da sbloccare, e una
  // stanza abbandonata si giocherebbe da sola fino alla bancarotta di qualcuno.
  private hasLivePlayers(): boolean {
    return this.game.players.some((p) => p.connected && !p.bankrupt);
  }

  private async persistAndBroadcast(events: GameEvent[] = []): Promise<void> {
    if (this.game.status === "playing" && this.hasLivePlayers()) {
      this.game.deadline = Date.now() + timeoutMs(this.game);
      await this.ctx.storage.setAlarm(this.game.deadline);
    } else {
      this.game.deadline = undefined;
      await this.ctx.storage.setAlarm(Date.now() + CLEANUP_MS); // partita finita o stanza vuota: si cancella
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
