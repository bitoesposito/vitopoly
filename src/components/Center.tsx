import { useEffect, useState } from "react";
import { activeNode, CHANCE, CHEST, legalActions } from "@vitopoly/game";
import type { GameEvent, PublicState } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { AssetsPanel, AuctionPanel, BuyPanel, DebtPanel, TradePanel } from "./Panels";

type T = ReturnType<typeof useT>;

function Countdown({ deadline }: { deadline?: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!deadline || now === 0) return null;
  const left = Math.max(0, Math.round((deadline - now) / 1000));
  return <span className={left <= 10 ? "font-bold text-destructive" : "text-muted-foreground"}> ⏱ {left}s</span>;
}

function Die({ value }: { value: number | null }) {
  return (
    <div className="grid size-10 place-items-center rounded-lg bg-foreground text-xl font-black text-background shadow-lg sm:size-12 sm:text-2xl">
      {value ?? "–"}
    </div>
  );
}

function lastRoll(events: GameEvent[]): [number, number] | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.e === "rolled") return [e.d1, e.d2];
  }
  return null;
}

function eventText(e: GameEvent, names: Record<string, string>, t: T): string {
  switch (e.e) {
    case "rolled":
      return t("ev.rolled", { name: names[e.pid], d1: e.d1, d2: e.d2 });
    case "moved":
      return t("ev.moved", { name: names[e.pid], to: e.to });
    case "paid": {
      const who = (x: string) => (x === "bank" ? t("ev.bank") : names[x]);
      return t("ev.paid", { from: who(e.from), to: who(e.to), amount: e.amount, why: e.why });
    }
    case "auctionWon":
      return t("ev.auctionWon", { name: names[e.pid], price: e.price });
    case "bankrupt":
      return t("ev.bankrupt", { name: names[e.pid] });
    case "card":
      return t("ev.card", { name: names[e.pid], text: (e.deck === "chance" ? CHANCE : CHEST)[e.cardId].text });
    case "info":
      return e.text;
  }
}

export function Center({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const events = useGame((s) => s.events);
  const error = useGame((s) => s.error);
  const t = useT();
  const dice = lastRoll(events);
  const legal = new Set(legalActions(game, myId));
  const isMyTurn = game.players[game.current]?.id === myId;
  const me = game.players.find((p) => p.id === myId);
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  const node = activeNode(game);
  const again = game.phase.t === "postRoll" && game.phase.again && game.stack.length === 0;

  if (game.status === "ended") {
    return (
      <div className="grid h-full place-items-center rounded-lg bg-card">
        <div className="text-center">
          <div className="text-5xl">🏆</div>
          <h2 className="mt-2 text-2xl font-bold text-warning">{t("center.winner", { name: game.winner ? names[game.winner] : t("center.nobody") })}</h2>
        </div>
      </div>
    );
  }

  // Fluid UX: one primary action at a time.
  const primary = (() => {
    if (!isMyTurn || node.t === "auction" || node.t === "debt" || node.t === "buyPrompt") return null;
    if (legal.has("roll") && node.t === "preRoll") return { label: t("center.roll"), action: () => send({ type: "roll" }) };
    if (again) return { label: t("center.rollAgain"), action: () => send({ type: "roll" }) };
    if (legal.has("endTurn") && node.t === "postRoll") return { label: t("center.endTurn"), action: () => send({ type: "endTurn" }) };
    return null;
  })();

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto rounded-lg bg-card p-2 sm:p-3">
      <div className="text-center text-[11px] text-muted-foreground">
        {t("center.turnOf")} <b className="text-foreground">{names[game.players[game.current]?.id]}</b>
        <Countdown deadline={game.deadline} />
      </div>

      <div className="flex items-center justify-center gap-3">
        <Die value={dice?.[0] ?? null} />
        <Die value={dice?.[1] ?? null} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {primary && (
          <Button className="px-6" onClick={primary.action}>
            {primary.label}
          </Button>
        )}
        {me?.inJail && isMyTurn && node.t === "preRoll" && (
          <>
            <Button variant="secondary" size="sm" onClick={() => send({ type: "payBail" })}>
              {t("center.payBail")}
            </Button>
            {me.jailCards > 0 && (
              <Button variant="secondary" size="sm" onClick={() => send({ type: "useJailCard" })}>
                {t("center.useJailCard")}
              </Button>
            )}
          </>
        )}
      </div>

      {error && <div className="text-center text-xs text-destructive">{error}</div>}

      <BuyPanel game={game} myId={myId} />
      <AuctionPanel game={game} myId={myId} />
      <DebtPanel game={game} myId={myId} />
      <AssetsPanel game={game} myId={myId} />
      <TradePanel game={game} myId={myId} />

      <div className="flex min-h-16 flex-1 flex-col-reverse overflow-y-auto rounded-md bg-muted p-2 text-[11px] leading-relaxed text-muted-foreground">
        <div>
          {game.log.map((e, i) => (
            <div key={i}>{eventText(e, names, t)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
