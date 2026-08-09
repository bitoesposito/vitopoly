import { useEffect, useRef, useState } from "react";
import { ChevronDown, Gavel } from "lucide-react";
import { toast } from "sonner";
import { AUCTION_MS, BOARD } from "@tangentopoly/game";
import type { AuctionFrame, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { GROUP_COLOR, GROUP_LABEL } from "@/lib/palette";
import { translate as t, tileName as tn } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { useGame } from "@/lib/store";
import { euro } from "@/lib/format";
import { TileDetails } from "@/components/board/TileDetails";

// Rilanci fissi: quelli proporzionati al prezzo collassavano (su un titolo da 60,
// 5% e 10% arrotondati davano lo stesso bottone due volte).
const QUICK_BIDS = [10, 25, 50];

// drains toward the deadline: 10s to open, 6s after each bid
function TimeBar({ deadline, total }: { deadline: number | undefined; total: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const pct = deadline ? Math.max(0, Math.min(100, ((deadline - now) / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden bg-muted">
      <div className={`h-full ${pct < 30 ? "bg-destructive" : "bg-warning"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Pannello inline dell'asta (tra giocatori e scambi): l'asta è un interrupt di gioco,
// quindi la Board resta bloccata (overlay in Board.tsx) e questa è l'unica sezione attiva.
export function AuctionPanel({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const [raise, setRaise] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const f = game.stack.at(-1);
  const live = f?.t === "auction";
  const a = live ? (f as AuctionFrame) : null;
  const leader = a?.leader;

  // mobile: l'asta si porta in vista da sola quando parte (la board è bloccata,
  // si interagisce da qui). L'istanza nascosta dell'altro breakpoint non ha box: no-op.
  useEffect(() => {
    if (live && !matchMedia("(min-width: 768px)").matches) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [live]);

  // sorpasso: 6 secondi per accorgersene, serve un segnale
  const wasLeader = useRef(false);
  useEffect(() => {
    if (wasLeader.current && leader && leader !== myId) toast.warning(t("auction.outbid"));
    wasLeader.current = leader === myId;
  }, [leader, myId]);

  if (!a) return null;
  const tile = BOARD[a.tile];
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  const myCash = game.players.find((p) => p.id === myId)?.cash ?? 0;
  const canBid = a.active.includes(myId) && a.leader !== myId;

  // Il campo è l'OFFERTA netta, non il rialzo; il motore ragiona in incrementi.
  const offer = Math.floor(Number(raise));
  const raiseOk = canBid && offer > a.bid && offer <= myCash;
  const doRaise = () => {
    if (!raiseOk) return;
    send({ type: "bid", amount: offer - a.bid });
    setRaise("");
  };

  return (
    // max-md:order-first: su mobile l'asta è la prima cosa sotto la board
    <Card ref={ref} size="sm" className="ring-2 ring-warning/60 duration-300 animate-in fade-in slide-in-from-top-2 max-md:order-first">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Gavel className="size-3.5" />
          {t("auction.title", { name: tn(a.tile) })}
        </div>
        {tile.group && (
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: GROUP_COLOR[tile.group] }} />
            <span className="text-micro tracking-widest text-muted-foreground uppercase">{GROUP_LABEL[tile.group]}</span>
            <div className="h-px flex-1" style={{ background: GROUP_COLOR[tile.group] }} />
          </div>
        )}

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xs font-semibold tracking-wide uppercase text-muted-foreground">{t("auction.current")}</div>
            {/* key sul leader: la cifra rientra a ogni cambio di testa */}
            <div key={a.leader ?? "none"} className="font-mono text-2xl font-bold tabular-nums text-warning duration-200 animate-in zoom-in-95">
              {euro(a.bid)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{a.leader ? t("auction.by", { name: names[a.leader] }) : t("auction.none")}</div>
        </div>

        <TimeBar deadline={game.deadline} total={a.bids.length ? AUCTION_MS.bid : AUCTION_MS.start} />

        <div className="flex gap-1">
          {QUICK_BIDS.map((d) => (
            <Button key={d} className="flex-1 font-mono tabular-nums" size="sm" disabled={!canBid || a.bid + d > myCash} onClick={() => send({ type: "bid", amount: d })}>
              {euro(a.bid + d)}
            </Button>
          ))}
        </div>

        {/* rilancio personalizzato: incremento sull'offer corrente, come i quick bid */}
        <div className="flex gap-1">
          <Input
            type="number"
            min={a.bid + 1}
            max={myCash}
            step={1}
            inputMode="numeric"
            placeholder={t("auction.custom")}
            className="h-9 flex-1 font-mono tabular-nums"
            value={raise}
            disabled={!canBid}
            onChange={(e) => setRaise(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doRaise()}
          />
          <Button size="sm" disabled={!raiseOk} onClick={doRaise}>
            {t("auction.raise")}
          </Button>
        </div>
        {canBid && offer > 0 && !raiseOk && (
          <div className="text-2xs text-destructive">
            {offer <= a.bid ? t("auction.tooLow", { amount: euro(a.bid) }) : t("auction.max", { amount: euro(myCash) })}
          </div>
        )}

        {canBid && (
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive" onClick={() => send({ type: "fold" })}>
            {t("auction.fold")}
          </Button>
        )}

        <div className="flex h-16 flex-col gap-1 overflow-y-auto bg-muted p-2 text-muted-foreground">
          {a.bids.length === 0 && <div className="text-xs">{t("auction.noBids")}</div>}
          {[...a.bids].reverse().map((b, i) => (
            <div className="flex items-center gap-1 text-xs leading-none" key={a.bids.length - i}>
              <b className="text-foreground">{names[b.pid]}</b> -{" "}
              <span className={`font-mono ${i === 0 ? "tabular-nums text-warning" : "text-muted-foreground"}`}>{euro(b.amount)}</span>
            </div>
          ))}
        </div>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
            {t("ui.details")}
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pt-2">
            <TileDetails index={a.tile} game={game} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
