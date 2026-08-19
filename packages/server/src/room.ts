import { DurableObject } from "cloudflare:workers";
import {
  activeNode,
  addPlayer,
  apply,
  auctionTimeout,
  createGame,
  redact,
  setConnected,
  timeoutAction,
  timeoutMs,
  invariantViolations,
  TOKENS,
} from "@tangentopoly/game";
import type { ChatMsg, ClientMsg, GameEvent, GameState, Result, ServerMsg } from "@tangentopoly/game";
import { misura } from "./metriche";
import { chiude, entra } from "./registro";
import type { Env } from "./index";

function seed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
}

// Quanto vive una stanza ferma. Un namespace di Durable Object non si può elencare, quindi
// uno spazzino non è scrivibile e ogni stanza deve cancellarsi da sé: l'invariante è che
// ogni transizione lasci esattamente un allarme armato (vedi arma()).
// Una stanza è una sessione, non un salvataggio. Il conto lungo vale solo dove c'è gente ma
// non si gioca: là è la rete per una socket morta in silenzio, e a 5 minuti una lobby piena
// si sveglierebbe 288 volte al giorno.
const VUOTA_MS = 5 * 60 * 1000;
const FERMA_MS = 60 * 60 * 1000;

// One room = one Durable Object. State is a single JSON blob under key "game".
export class RoomDO extends DurableObject<Env> {
  private game!: GameState;
  private chat!: ChatMsg[];
  // pid -> segreto. Fuori dal blob del gioco: redact() non può perderlo per sbaglio.
  private seats!: Record<string, string>;
  // Il codice della stanza. Il Durable Object lo riceve solo nell'URL di ingresso, ma le
  // metriche servono anche quando parla un allarme: si ricorda una volta e basta.
  private codice!: string;
  // Quel che il registro vuole sapere e il motore non tiene: quando la stanza è nata, quando
  // la partita è partita, quante azioni a mano e quante dal timer. Sta accanto al blob del
  // gioco, quindi sopravvive all'ibernazione.
  private vita!: { aperta: number; iniziata: number | null; umane: number; auto: number };
  private lastChatAt: Record<string, number> = {};

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Runs before any fetch/message, including after a hibernation wake — nothing to rehydrate but the blobs.
    ctx.blockConcurrencyWhile(async () => {
      this.game = (await ctx.storage.get<GameState>("game")) ?? createGame(seed());
      this.game.kickVotes ??= {}; // blobs persisted before votekick existed
      this.chat = (await ctx.storage.get<ChatMsg[]>("chat")) ?? [];
      this.seats = (await ctx.storage.get<Record<string, string>>("seats")) ?? {};
      this.codice = (await ctx.storage.get<string>("codice")) ?? "";
      this.vita = (await ctx.storage.get<typeof this.vita>("vita")) ?? { aperta: Date.now(), iniziata: null, umane: 0, auto: 0 };
    });
  }

  // Il posto è di chi ne ha il segreto: un pid mai visto lo occupa e lo riceve, un pid già
  // occupato col segreto sbagliato resta spettatore. Si conia solo a chi può davvero
  // sedersi, così un curioso che apre il link non costa una scrittura e una riga di mappa.
  private async claimSeat(pid: string, token: string | null): Promise<string | null> {
    const existing = this.seats[pid];
    if (existing) return existing === token ? existing : null;
    if (this.game.status !== "lobby" || this.game.players.length >= TOKENS) return null;
    const minted = crypto.randomUUID();
    this.seats = { ...this.seats, [pid]: minted };
    await this.ctx.storage.put("seats", this.seats);
    return minted;
  }

  // Il testo per chi guarda, e la stessa ragione in due parole per le metriche.
  private whySpectator(pid: string): { motivo: string; testo: string } {
    if (this.seats[pid]) return { motivo: "posto occupato", testo: "questo posto è di un altro giocatore: puoi solo guardare" };
    if (this.game.status !== "lobby") return { motivo: "già iniziata", testo: "la partita è già iniziata: puoi solo guardare" };
    return { motivo: "al completo", testo: `il tavolo è al completo (${TOKENS} giocatori): puoi solo guardare` };
  }

  // Da dove e con cosa si gioca, senza chiedere niente a nessuno: l'intestazione del paese
  // la mette Cloudflare, il resto è l'User-Agent. È una stima grossolana di proposito:
  // serve a sapere se il gioco vive sui telefoni, non a profilare.
  private static provenienza(req: Request): { paese: string; dispositivo: string } {
    const ua = req.headers.get("user-agent") ?? "";
    const dispositivo = /iphone|ipod|android.*mobile|windows phone/i.test(ua)
      ? "telefono"
      : /ipad|tablet|android/i.test(ua)
        ? "tablet"
        : "desktop";
    return { paese: req.headers.get("cf-ipcountry") ?? "", dispositivo };
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const codice = url.pathname.split("/")[3] ?? ""; // /api/room/<codice>/ws
    if (codice && this.codice !== codice) {
      this.codice = codice;
      this.vita = { ...this.vita, aperta: Date.now() };
      await this.ctx.storage.put({ codice, vita: this.vita });
    }
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
      misura(this.env, this.codice, {
        evento: "ingresso",
        dettaglio: "posto",
        giocatori: this.game.players.length,
        pid,
        ...RoomDO.provenienza(req),
      });
      await entra(this.env, this.codice, {
        pid,
        nome: joined.name,
        inchiostro: joined.token,
        spettatore: false,
        ...RoomDO.provenienza(req),
      });
      await this.persistAndBroadcast();
    } else {
      // spettatore: vede stato e chat. Dirgli PERCHÉ, o il banner "stai guardando" è un muro.
      const perche = this.whySpectator(pid);
      this.send(server, { type: "error", error: perche.testo });
      misura(this.env, this.codice, {
        evento: "ingresso",
        dettaglio: "spettatore",
        come: perche.motivo,
        giocatori: this.game.players.length,
        pid,
        ...RoomDO.provenienza(req),
      });
      await entra(this.env, this.codice, { pid, nome: name, inchiostro: null, spettatore: true, ...RoomDO.provenienza(req) });
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
      const text = String(msg.text ?? "")
        .slice(0, 300)
        .trim();
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
    misura(this.env, this.codice, { evento: "azione", dettaglio: msg.action.type, come: "umano", giocatori: this.game.players.length });
    this.vita.umane++;
    await this.commit(r, ws);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const { pid } = ws.deserializeAttachment() as { pid: string };
    setConnected(this.game, pid, false);
    await this.persistAndBroadcast();
  }

  // una socket che muore male non chiama webSocketClose, e il giocatore resterebbe
  // "collegato" per sempre
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
    // Scaduto il silenzio la stanza si cancella. deleteAll() svuota lo storage ma non
    // l'istanza, e il costruttore rigira solo dopo lo sfratto: la memoria si azzera qui, o
    // la prima scrittura resuscita la partita.
    if (this.game.status === "ended" || !this.hasLivePlayers()) {
      const esito = this.game.status === "ended" ? "finita" : this.game.status === "lobby" ? "mai iniziata" : "abbandonata";
      misura(this.env, this.codice, { evento: "sfratto", dettaglio: esito, giocatori: this.game.players.length });
      // le partite finite hanno già il loro verbale: qui si scrivono quelle che non finiscono
      if (esito !== "finita") await chiude(this.env, this.codice, this.game, { ...this.vita, esito });
      await this.ctx.storage.deleteAll();
      this.game = createGame(seed());
      this.chat = [];
      this.seats = {};
      this.codice = "";
      return;
    }
    // in attesa con qualcuno collegato: niente da fare, ma l'allarme va riarmato o la
    // stanza resta senza
    if (this.game.status !== "playing") return void (await this.arma());
    if (!this.game.deadline) return void (await this.arma());
    if (Date.now() < this.game.deadline - 1000) {
      // an action moved the deadline after this alarm was queued — re-arm
      await this.ctx.storage.setAlarm(this.game.deadline);
      return;
    }
    let r: Result;
    let quale: string;
    if (activeNode(this.game).t === "auction") {
      r = auctionTimeout(this.game); // timer expiry settles to the leader (or nobody)
      quale = "asta";
    } else {
      const t = timeoutAction(this.game);
      if (!t) return void (await this.arma());
      quale = t.action.type;
      r = apply(this.game, t.pid, t.action);
      if (!r.ok && activeNode(this.game).t === "debt") r = apply(this.game, t.pid, { type: "bankrupt" }); // can't pay -> out
    }
    // Nessuna azione automatica possibile: la stanza resta agli umani, ma CON un allarme.
    // Uscire senza riarmare la lascerebbe senza timer, né turno né sfratto: nessuno la
    // raccoglierebbe più.
    if (!r.ok) return void (await this.arma());
    misura(this.env, this.codice, { evento: "azione", dettaglio: quale, come: "timeout", giocatori: this.game.players.length });
    this.vita.auto++;
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
    if (this.game.status === "lobby" && r.state.status === "playing") this.vita.iniziata = Date.now();
    const finita = this.game.status !== "ended" && r.state.status === "ended";
    if (finita) {
      const vinto = r.state.players.find((p) => p.id === r.state.winner);
      misura(this.env, this.codice, {
        evento: "fine",
        giocatori: r.state.players.length,
        falliti: r.state.players.filter((p) => p.bankrupt).length,
        soldi: vinto?.cash ?? 0,
      });
    }
    r.state.log = [...r.state.log, ...r.events].slice(-100);
    this.game = r.state;
    if (finita) await chiude(this.env, this.codice, this.game, { ...this.vita, esito: "finita" });
    await this.persistAndBroadcast(r.events);
  }

  // C'è ancora qualcuno che gioca davvero? Il timer del turno esiste per non far aspettare
  // gli altri: a stanza vuota non ha nessuno da sbloccare, e giocherebbe da sola.
  // Le socket aperte, non `connected`: quel flag racconta la UI e può restare vero se una
  // socket muore senza che il close arrivi, e una stanza che si crede abitata riarma il
  // turno all'infinito, giocandosi addosso.
  private hasLivePlayers(): boolean {
    const attivi = new Set(
      this.ctx
        .getWebSockets()
        .filter((ws) => ws.readyState === WebSocket.READY_STATE_OPEN)
        .map((ws) => (ws.deserializeAttachment() as { pid: string }).pid)
    );
    return this.game.players.some((p) => attivi.has(p.id) && !p.bankrupt);
  }

  /** L'unico allarme della stanza: il timer del turno se si gioca davvero, altrimenti il
   *  conto alla rovescia che la cancella. Da chiamare a OGNI transizione. */
  private async arma(): Promise<void> {
    if (this.game.status === "playing" && this.hasLivePlayers()) {
      this.game.deadline = Date.now() + timeoutMs(this.game);
      await this.ctx.storage.setAlarm(this.game.deadline);
      return;
    }
    this.game.deadline = undefined;
    await this.ctx.storage.setAlarm(Date.now() + (this.hasLivePlayers() ? FERMA_MS : VUOTA_MS));
  }

  private async persistAndBroadcast(events: GameEvent[] = []): Promise<void> {
    await this.arma();
    await this.ctx.storage.put({ game: this.game, vita: this.vita });
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
