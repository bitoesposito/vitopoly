import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, Clock, Dices, Ticket, type LucideIcon } from "lucide-react";
import { activeNode, BOARD, CHANCE, CHEST, legalActions } from "@tangentopoly/game";
import type { DebtFrame, GameEvent, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Regole } from "./Regole";
import { useGame } from "@/lib/store";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { euro } from "@/lib/utils";
import { TOKEN_COLOR, serie } from "@/lib/colors";

type T = ReturnType<typeof useT>;

// scala unica delle azioni del centro
const AZIONE = "text-sm md:text-base lg:text-lg";

function Countdown({ deadline }: { deadline?: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!deadline || now === 0) return null;
  const left = Math.max(0, Math.round((deadline - now) / 1000));
  return (
    <span className={`ml-1 inline-flex items-center gap-0.5 font-mono tabular-nums ${left <= 10 ? "font-bold text-destructive" : "text-muted-foreground"}`}>
      <Clock className="size-3.5" /> {left}s
    </span>
  );
}

// rotazione del cubo che porta davanti la faccia col valore (vedi .die-* in index.css)
const DIE_FACE: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(-90deg)",
  3: "rotateY(90deg)",
  4: "rotateY(-90deg)",
  5: "rotateX(90deg)",
  6: "rotateX(180deg)",
};

// Dado 3D senza stato: key={spin} rimonta il cubo a ogni tiro e l'animazione CSS
// one-shot riparte; quando finisce, la transition lo accompagna sulla faccia uscita.
// `alt` varia durata e verso del tumble.
function Die3D({ value, spin, alt }: { value: number | null; spin: number; alt?: boolean }) {
  return (
    // key sulla scena e sul cubo: al tiro rimontano insieme, così arco e rotazione partono in fase
    <div key={spin} className="die-scene die-tossing">
      {/* la faccia va in --face (non in transform): così l'hover può comporre il tilt 3D */}
      <div className={`die ${alt ? "die-rolling-alt" : "die-rolling"}`} style={{ "--face": DIE_FACE[value ?? 1] } as React.CSSProperties}>
        {(["front", "back", "top", "bottom", "right", "left"] as const).map((f) => (
          <div key={f} className={`die-face die-${f}`} />
        ))}
      </div>
    </div>
  );
}

function lastRoll(events: GameEvent[]): Extract<GameEvent, { e: "rolled" }> | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.e === "rolled") return e;
  }
  return null;
}

// contante + titoli; ipotecate a metà, come le rivende la banca
function patrimonio(game: PublicState, pid: string): number {
  const p = game.players.find((x) => x.id === pid);
  let v = p?.cash ?? 0;
  for (const [id, own] of Object.entries(game.props)) {
    if (!own || own.owner !== pid) continue;
    const def = BOARD[Number(id)];
    v += own.mortgaged ? Math.floor((def.price ?? 0) / 2) : def.price ?? 0;
    v += own.houses * (def.houseCost ?? 0);
  }
  return v;
}

// dado, spostamenti e pagamenti d'asta non finiscono nel log: li raccontano già
// dadi/pedine/pannello asta. Il resto diventa una riga di prosa (in seconda persona se sei tu).
function logLine(e: GameEvent, names: Record<string, string>, t: T, tn: (i: number) => string, myId: string): string | null {
  switch (e.e) {
    case "rolled":
    case "moved":
      return null;
    case "paid": {
      const who = (x: string) => (x === "bank" ? t("ev.bank") : names[x]);
      const w = e.why;
      if (w === "auction") return null; // già coperto da auctionWon
      if (w === "GO salary") return t("ev.goSalary", { name: who(e.to), amount: euro(e.amount) });
      if (w === "bail") return t("ev.bail", { name: who(e.from), amount: euro(e.amount) });
      if (w === "tax") return t("ev.tax", { name: who(e.from), amount: euro(e.amount) });
      if (w === "vacation cash") return t("ev.vacation", { name: who(e.to), amount: euro(e.amount) });
      if (w.startsWith("buy ")) return t("ev.bought", { name: who(e.from), tile: w.slice(4) }); // why porta già il nome italiano
      return t("ev.paid", { from: who(e.from), to: who(e.to), amount: euro(e.amount) });
    }
    case "asset": {
      const key =
        e.what === "build" ? (e.hotel ? "ev.buildHotel" : "ev.build")
        : e.what === "sellHouse" ? (e.hotel ? "ev.sellHotel" : "ev.sellHouse")
        : `ev.${e.what}`; // mortgage | unmortgage | sellProperty
      return t(key, { name: names[e.pid], tile: tn(e.tile), amount: euro(e.amount) });
    }
    case "auctionWon":
      return t("ev.auctionWon", { name: names[e.pid], tile: tn(e.tile), price: euro(e.price) });
    case "jailed":
      return e.pid === myId ? t("ev.jailedYou") : t("ev.jailed", { name: names[e.pid] });
    case "bankrupt":
      return t("ev.bankrupt", { name: names[e.pid] });
    case "card":
      return t("ev.card", { name: names[e.pid], text: (e.deck === "chance" ? CHANCE : CHEST)[e.cardId].text });
    case "traded":
      return t("ev.traded", { a: names[e.from], b: names[e.to] });
    case "info":
      return e.text;
  }
}

export function Center({ game }: { game: PublicState }) {
  // il contenitore vive in index.html: esiste già al primo render
  const [barra] = useState(() => document.getElementById("barra-azione"));
  const myId = useGame((s) => s.myId);
  const events = useGame((s) => s.events);
  const t = useT();
  const tn = useTileName();
  const dice = lastRoll(events);
  // nuovo evento rolled (per identità) -> nuovo tumble; ref toccata solo nell'effect
  const [spin, setSpin] = useState(0);
  const lastRollEv = useRef<GameEvent | null>(null);
  useEffect(() => {
    if (dice && lastRollEv.current !== dice) {
      lastRollEv.current = dice;
      setSpin((n) => n + 1);
    }
  }, [dice]);
  const legal = new Set(legalActions(game, myId));
  const isMyTurn = game.players[game.current]?.id === myId;
  const me = game.players.find((p) => p.id === myId);
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  const node = activeNode(game);
  const again = game.phase.t === "postRoll" && game.phase.again && game.stack.length === 0;
  const canRoll = isMyTurn && ((node.t === "preRoll" && legal.has("roll")) || again);

  if (game.status === "ended") {
    const classifica = [...game.players].sort((a, b) => patrimonio(game, b.id) - patrimonio(game, a.id));
    return (
      <div className="tratteggio grid h-full place-items-center overflow-y-auto bg-card p-3 font-condensed">
        <div className="w-full max-w-xs text-center">
          <h2 className="text-2xl font-bold text-warning">
            {t("center.winner", { name: game.winner ? names[game.winner] : t("center.nobody") })}
          </h2>
          <ol className="mt-4 space-y-1 text-left text-xs">
            {classifica.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 border-b border-border pb-1">
                <span className="w-4 font-mono tabular-nums text-muted-foreground">{i + 1}</span>
                <span
                  className="flex size-4 shrink-0 items-center justify-center font-mono text-micro leading-none ring-1 ring-paper-ink/50"
                  style={{ background: TOKEN_COLOR[p.token % 8], color: "var(--color-paper-ink)" }}
                >
                  {serie(p.token)}
                </span>
                <span className={`min-w-0 truncate ${p.bankrupt ? "text-muted-foreground line-through" : ""}`}>{p.name}</span>
                <span className="ml-auto font-mono tabular-nums text-success">{euro(patrimonio(game, p.id))}</span>
              </li>
            ))}
          </ol>
          <div className="mt-2 text-micro tracking-wide text-muted-foreground uppercase">{t("end.worth")}</div>
          {/* il motore non riparte da "ended": la rivincita è una stanza nuova */}
          <Button className="mt-4 w-full" onClick={() => (location.href = location.origin + location.pathname)}>
            {t("end.again")}
          </Button>
        </div>
      </div>
    );
  }

  // Fluid UX: one primary action at a time.
  const primary = (() => {
    if (!isMyTurn || node.t === "auction" || node.t === "debt" || node.t === "buyPrompt") return null;
    if (legal.has("roll") && node.t === "preRoll") return { label: t("center.roll"), icon: Dices as LucideIcon | null, action: () => send({ type: "roll" }) };
    if (again) return { label: t("center.rollAgain"), icon: Dices as LucideIcon | null, action: () => send({ type: "roll" }) };
    if (legal.has("endTurn") && node.t === "postRoll") return { label: t("center.endTurn"), icon: null as LucideIcon | null, action: () => send({ type: "endTurn" }) };
    return null;
  })();

  const debito = node.t === "debt" ? (node as DebtFrame) : null;
  const dovuto = debito?.claims.reduce((s, c) => s + c.amount, 0) ?? 0;
  // a chi si deve
  const creditori = debito
    ? [...new Set(debito.claims.map((c) => (c.creditor === "bank" ? t("ev.bank") : names[c.creditor] ?? "?")))].join(", ")
    : "";

  // il risultato del dado esiste solo come trasformazione CSS: senza questo è muto
  const annuncio = [
    dice ? t("aria.rolled", { d1: dice.d1, d2: dice.d2 }) : "",
    isMyTurn ? t("center.yourTurn") : t("center.turnOf") + " " + (names[game.players[game.current]?.id] ?? ""),
    node.t === "buyPrompt" ? t("buy.q", { name: tn(node.tile) }) + " " + euro(BOARD[node.tile].price ?? 0) : "",
    debito && debito.debtor === myId ? t("debt.youOwe", { total: euro(dovuto), to: creditori }) : "",
  ]
    .filter(Boolean)
    .join(". ");

  // montato in un solo posto per volta: sotto i dadi da md, nella barra fissa sotto md
  const azioni = (
    <>
      {primary && (
        <Button size="lg" className={AZIONE} onClick={primary.action}>
          {primary.icon && <primary.icon className="size-4" />}
          {primary.label}
        </Button>
      )}
      {me?.inJail && isMyTurn && node.t === "preRoll" && (
        <>
          <Button size="lg" className={AZIONE} variant="secondary" onClick={() => send({ type: "payBail" })}>
            {t("center.payBail")}
          </Button>
          {me.jailCards > 0 && (
            <Button size="lg" className={AZIONE} variant="secondary" onClick={() => send({ type: "useJailCard" })}>
              <Ticket className="size-4" />
              {t("center.useJailCard")}
            </Button>
          )}
        </>
      )}
      {node.t === "buyPrompt" && isMyTurn && (
        <>
          <Button size="lg" className={AZIONE} disabled={(me?.cash ?? 0) < (BOARD[node.tile].price ?? 0)} onClick={() => send({ type: "buy" })}>
            {t("buy.buy")}
          </Button>
          <Button size="lg" className={AZIONE} variant="secondary" onClick={() => send({ type: "decline" })}>
            {game.settings.auction ? t("buy.declineAuction") : t("buy.decline")}
          </Button>
        </>
      )}
      {debito && debito.debtor === myId && (
        <>
          <Button size="lg" className={AZIONE} disabled={(me?.cash ?? 0) < debito.claims[0].amount} onClick={() => send({ type: "payDebt" })}>
            {t("debt.pay")}
          </Button>
          <Button
            size="lg"
            className={AZIONE}
            variant="destructive"
            onClick={() => confirm(t("debt.confirmBankrupt")) && send({ type: "bankrupt" })}
          >
            {t("debt.bankrupt")}
          </Button>
        </>
      )}
    </>
  );

  return (
    // il centro è parte del tabellone: stessa voce delle tiles
    <div className="tratteggio flex h-full flex-col gap-2 overflow-y-auto bg-card p-2 font-condensed sm:p-3">
      <p className="sr-only" role="status" aria-live="polite">
        {annuncio}
      </p>
      {/* metà alta ANCORATA in alto (niente justify-center): riga turno e dadi hanno
          posizione fissa, prompt e bottoni crescono verso il basso senza spostare nulla */}
      <div className="flex flex-1 basis-0 flex-col items-center gap-2 pt-1 sm:gap-3 sm:pt-2">
      {/* il centro scala con la board, come le tiles */}
      <div className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground sm:text-sm lg:text-base">
        <span>
          {isMyTurn ? (
            <b className="text-foreground">{t("center.yourTurn")}</b>
          ) : (
            <>
              {t("center.turnOf")} <b className="text-foreground">{names[game.players[game.current]?.id]}</b>
            </>
          )}
          <Countdown deadline={game.deadline} />
        </span>
        {/* le regole restano raggiungibili in partita: è una variante, e finora si
            scoprivano solo atterrandoci sopra */}
        {me && <span className="font-mono tabular-nums text-success">{euro(me.cash)}</span>}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t("rules.title")}>
              <CircleHelp className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-h-[70dvh] w-80 overflow-y-auto font-sans">
            <Regole />
          </PopoverContent>
        </Popover>
      </div>

      {/* i dadi sono la scorciatoia per il puntatore: l'azione ha già il suo bottone */}
      <button
        type="button"
        disabled={!canRoll}
        tabIndex={-1}
        aria-hidden
        onClick={() => send({ type: "roll" })}
        title={canRoll ? t("center.roll") : undefined}
        className={`dice-tray flex items-center justify-center gap-2 sm:gap-3 [--die:3rem] sm:[--die:3.5rem] lg:[--die:4rem] ${canRoll ? "" : "opacity-60"}`}
      >
        <Die3D value={dice?.d1 ?? null} spin={spin} />
        <Die3D value={dice?.d2 ?? null} spin={spin} alt />
      </button>

      {/* single action zone; #azione = bersaglio dello skip link (40 celle lo precedono) */}
      <div id="azione" tabIndex={-1} className="flex flex-col items-center gap-2 focus:outline-none">
        {node.t === "buyPrompt" && isMyTurn && (
          <div className="text-center text-sm font-semibold lg:text-base">
            {t("buy.q", { name: tn(node.tile) })} <span className="font-mono text-success">{euro(BOARD[node.tile].price ?? 0)}</span>?
          </div>
        )}
        {debito && (debito.debtor === myId ? (
          <div className="space-y-1 text-center">
            <div className="text-sm font-semibold text-destructive lg:text-base">
              {t("debt.youOwe", { total: euro(dovuto), to: creditori })}
            </div>
            <div className="text-xs text-muted-foreground lg:text-sm">{t("debt.help")}</div>
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground lg:text-sm">
            {t("debt.someone", { name: names[debito.debtor] ?? "", total: euro(dovuto) })}
          </div>
        ))}

        {/* sotto md le azioni si spostano nella barra: display:none le toglie anche dal tab */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-md:hidden">{azioni}</div>
      </div>
      </div>

      {/* metà bassa: log */}

      {/* log: il più recente in alto. È l'unico posto dove si leggono espulsioni e timeout. */}
      <div className="min-h-16 w-full flex-1 basis-0 overflow-y-auto rounded-md p-2 text-2xs leading-relaxed text-muted-foreground sm:text-xs lg:text-sm">
        <div className="flex flex-col text-center">
          {game.log
            .flatMap((e, i) => {
              const line = logLine(e, names, t, tn, myId);
              return line ? [{ line, i }] : [];
            })
            .slice(-30)
            .reverse()
            .map(({ line, i }, j) => (
              <div key={i} className={j === 0 ? "font-semibold text-foreground" : ""}>
                {line}
              </div>
            ))}
        </div>
      </div>

      {/* zona pollice: la barra vive in index.html e porta la sua cromatura */}
      {barra && createPortal(azioni, barra)}
    </div>
  );
}
