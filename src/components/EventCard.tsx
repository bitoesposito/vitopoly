import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Gem, Handshake, HelpCircle, KeyRound, Lock, type LucideIcon } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { Bundle } from "@tangentopoly/game";
import { GROUP_COLOR } from "@/lib/colors";
import { useGame, type CardPopup } from "@/lib/store";
import { useT, useTileName } from "@/lib/i18n";
import { BundleChips } from "./Panels";

// Animated event cards. Each popup pops in the moment it's pushed (ws.ts schedules
// the timing), stacks on the previous ones, and dismisses itself after a hold long
// enough to read. Non-blocking: clicks pass through around the stack, a tap on a
// card dismisses it. Trades get their own animation: the exchanged assets fly
// between the two players.

const STYLE: Record<CardPopup["kind"], { icon: LucideIcon; accent: string; titleKey: string }> = {
  chance: { icon: HelpCircle, accent: "var(--color-warning)", titleKey: "popup.chance" },
  chest: { icon: Gem, accent: "#4ba3f5", titleKey: "popup.chest" },
  jailed: { icon: Lock, accent: "var(--color-destructive)", titleKey: "popup.jail" },
  buy: { icon: KeyRound, accent: "var(--color-success)", titleKey: "popup.buy" },
  trade: { icon: Handshake, accent: "#a78bfa", titleKey: "popup.trade" },
};

// reading time, not a cinematic pause
const holdMs = (p: CardPopup, body: string) =>
  p.kind === "trade" ? 3200 : Math.min(1400 + body.length * 28, 3200);

function TradeBody({ p }: { p: Extract<CardPopup, { kind: "trade" }> }) {
  const empty = (b: Bundle) => b.cash === 0 && b.props.length === 0 && b.jailCards === 0;
  return (
    <div className="w-full space-y-2 text-left">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <span className="truncate">{p.from}</span>
        <Handshake className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{p.to}</span>
      </div>
      {!empty(p.give) && (
        <div className="flex flex-wrap items-center gap-1">
          <BundleChips b={p.give} fly="r" />
          <ArrowRight className="size-3.5 shrink-0 text-success" />
        </div>
      )}
      {!empty(p.get) && (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <ArrowLeft className="size-3.5 shrink-0 text-success" />
          <BundleChips b={p.get} fly="l" />
        </div>
      )}
    </div>
  );
}

function PopCard({ popup, depth }: { popup: CardPopup; depth: number }) {
  const t = useT();
  const tn = useTileName();
  const [out, setOut] = useState(false);
  const [entered, setEntered] = useState(popup.wait === 0); // invisible while waiting -> no ghost click-catcher
  const trade = popup.kind === "trade";
  const { icon: Icon, accent, titleKey } = STYLE[popup.kind];

  const body =
    popup.kind === "jailed" ? (popup.you ? t("ev.jailedYou") : t("ev.jailed", { name: popup.name }))
    : popup.kind === "buy" ? tn(popup.tile)
    : popup.kind === "trade" ? ""
    : popup.text;

  useEffect(() => {
    const enter = setTimeout(() => setEntered(true), popup.wait);
    const hold = setTimeout(() => setOut(true), popup.wait + 550 + holdMs(popup, body));
    return () => {
      clearTimeout(enter);
      clearTimeout(hold);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- popup/body are stable for this id
  }, []);
  useEffect(() => {
    if (!out) return;
    const gone = setTimeout(() => useGame.getState().removePopup(popup.id), 240);
    return () => clearTimeout(gone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [out]);

  const stripe = popup.kind === "buy" ? (GROUP_COLOR[BOARD[popup.tile].group ?? ""] ?? accent) : accent;

  return (
    // outer layer = position in the stack (older cards drift up and shrink), inner layer = pop animation
    <div
      className="absolute transition-transform duration-300"
      style={{ transform: `translateY(${-depth * 12}px) rotate(${depth * (popup.id % 2 ? -2 : 2)}deg) scale(${1 - depth * 0.04})` }}
    >
      <div
        onClick={() => setOut(true)}
        className={`${entered ? "pointer-events-auto" : ""} cursor-pointer border bg-card text-card-foreground shadow-xl ${trade ? "w-64 sm:w-72" : "w-48 sm:w-56"} ${out ? "card-pop-out" : trade ? "trade-pop-in" : "card-pop-in"}`}
        style={{ borderColor: accent, animationDelay: out ? undefined : `${popup.wait}ms` }}
      >
        <div className="h-1" style={{ background: stripe }} />
        <div className="flex flex-col items-center gap-1 p-3 text-center">
          <div className="flex items-center gap-1.5 text-2xs font-semibold tracking-[0.18em] uppercase" style={{ color: accent }}>
            <Icon className="size-3.5" />
            {t(titleKey)}
          </div>
          {trade ? (
            <TradeBody p={popup as Extract<CardPopup, { kind: "trade" }>} />
          ) : (
            <>
              <div className="text-sm leading-snug font-medium">{body}</div>
              {popup.kind !== "jailed" && (
                <div className="text-xs text-muted-foreground">
                  {popup.kind === "buy" ? (
                    <>
                      {popup.name} · <span className="text-success">€{popup.price}</span>
                    </>
                  ) : (
                    popup.name
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function EventCardOverlay() {
  const popups = useGame((s) => s.popups);
  if (popups.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4">
      {/* DOM order = stack order: the newest card paints on top */}
      {popups.map((p, i) => (
        <PopCard key={p.id} popup={p} depth={popups.length - 1 - i} />
      ))}
    </div>
  );
}
