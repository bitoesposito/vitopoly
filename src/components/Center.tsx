import { useEffect, useState } from "react";
import { Clock, Dices, Ticket, Trophy, type LucideIcon } from "lucide-react";
import { activeNode, BOARD, CHANCE, CHEST, legalActions } from "@tangentopoly/game";
import type { DebtFrame, GameEvent, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/store";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";

type T = ReturnType<typeof useT>;

function Countdown({ deadline }: { deadline?: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!deadline || now === 0) return null;
  const left = Math.max(0, Math.round((deadline - now) / 1000));
  return (
    <span className={`ml-1 inline-flex items-center gap-0.5 ${left <= 10 ? "font-bold text-destructive" : "text-muted-foreground"}`}>
      <Clock className="size-3.5" /> {left}s
    </span>
  );
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

function eventText(e: GameEvent, names: Record<string, string>, t: T, tn: (i: number) => string): string {
  switch (e.e) {
    case "rolled":
      return t("ev.rolled", { name: names[e.pid], d1: e.d1, d2: e.d2 });
    case "moved":
      return t("ev.moved", { name: names[e.pid], to: tn(e.to) });
    case "paid": {
      const who = (x: string) => (x === "bank" ? t("ev.bank") : names[x]);
      return t("ev.paid", { from: who(e.from), to: who(e.to), amount: e.amount, why: e.why });
    }
    case "auctionWon":
      return t("ev.auctionWon", { name: names[e.pid], price: e.price });
    case "jailed":
      return t("ev.jailed", { name: names[e.pid] });
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
  const tn = useTileName();
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
          <Trophy className="mx-auto size-10 text-warning" />
          <h2 className="mt-2 text-2xl font-bold text-warning">{t("center.winner", { name: game.winner ? names[game.winner] : t("center.nobody") })}</h2>
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

      {/* single action zone: every decision (roll/buy/debt/jail) shows here, under the dice */}
      <div className="flex flex-col items-center gap-2">
        {node.t === "buyPrompt" && isMyTurn && (
          <div className="text-center text-sm font-semibold">
            {t("buy.q", { name: tn(node.tile) })} <span className="text-success">${BOARD[node.tile].price}</span>?
          </div>
        )}
        {node.t === "debt" && ((node as DebtFrame).debtor === myId ? (
          <div className="space-y-1 text-center">
            <div className="text-sm font-semibold text-destructive">
              {t("debt.youOwe", { total: (node as DebtFrame).claims.reduce((s, c) => s + c.amount, 0) })}
            </div>
            <div className="text-xs text-muted-foreground">{t("debt.help")}</div>
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground">
            {t("debt.someone", {
              name: names[(node as DebtFrame).debtor] ?? "",
              total: (node as DebtFrame).claims.reduce((s, c) => s + c.amount, 0),
            })}
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {primary && (
            <Button className="px-6" onClick={primary.action}>
              {primary.icon && <primary.icon className="size-4" />}
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
                  <Ticket className="size-4" />
                  {t("center.useJailCard")}
                </Button>
              )}
            </>
          )}
          {node.t === "buyPrompt" && isMyTurn && (
            <>
              <Button size="sm" disabled={(me?.cash ?? 0) < (BOARD[node.tile].price ?? 0)} onClick={() => send({ type: "buy" })}>
                {t("buy.buy")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => send({ type: "decline" })}>
                {game.settings.auction ? t("buy.declineAuction") : t("buy.decline")}
              </Button>
            </>
          )}
          {node.t === "debt" && (node as DebtFrame).debtor === myId && (
            <>
              <Button size="sm" disabled={(me?.cash ?? 0) < (node as DebtFrame).claims[0].amount} onClick={() => send({ type: "payDebt" })}>
                {t("debt.pay")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => send({ type: "bankrupt" })}>
                {t("debt.bankrupt")}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <div className="text-center text-xs text-destructive">{error}</div>}

      {/* game log: newest on top, no scrollbar — older lines fade out below */}
      <div className="min-h-16 w-full flex-1 overflow-hidden rounded-md p-2 text-[11px] leading-relaxed text-muted-foreground [mask-image:linear-gradient(to_bottom,black_40%,transparent_95%)]">
        <div className="flex flex-col text-center">
          {[...game.log].slice(-30).reverse().map((e, i) => (
            <div key={game.log.length - i} className={i === 0 ? "font-semibold text-foreground" : ""}>
              {eventText(e, names, t, tn)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
