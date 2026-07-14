import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { AUCTION_MS, BOARD } from "@tangentopoly/game";
import type { AuctionFrame, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { GROUP_COLOR } from "@/lib/colors";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { useGame } from "@/lib/store";
import { TileDetails } from "./TileDetails";

const QUICK_BIDS = [2, 10, 100];

// Barra che si svuota verso la deadline (10s all'apertura, 6s dopo ogni offerta).
function TimeBar({ deadline, total }: { deadline: number | undefined; total: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const pct = deadline ? Math.max(0, Math.min(100, ((deadline - now) / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${pct < 30 ? "bg-destructive" : "bg-warning"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Overlay non chiudibile reso DENTRO la Board: oscura e isola solo il tabellone (la sidebar
// con giocatori/soldi/proprietà/chat resta intatta). Sparisce quando il frame lascia lo stack.
export function AuctionDialog({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const t = useT();
  const tn = useTileName();
  const f = game.stack.at(-1);
  if (f?.t !== "auction") return null;
  const a = f as AuctionFrame;
  const tile = BOARD[a.tile];
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  const myCash = game.players.find((p) => p.id === myId)?.cash ?? 0;
  const canBid = a.active.includes(myId) && a.leader !== myId;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex flex-col gap-2 flex-1 max-w-[30rem] p-3 border border-border">
        <div>
          <div className="flex items-center gap-2 font-heading text-sm font-medium">
            <Gavel className="size-4" />
            {t("auction.title", { name: tn(a.tile) })}
          </div>
          {tile.group && <div className="mt-2 h-1.5 rounded-full" style={{ background: GROUP_COLOR[tile.group] }} />}
        </div>

        <div className="grid gap-4 grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">{t("auction.current")}</div>
              <div className="text-2xl font-bold tabular-nums text-warning">${a.bid}</div>
              <div className="text-muted-foreground text-sm">{a.leader ? t("auction.by", { name: names[a.leader] }) : t("auction.none")}</div>
            </div>

            <TimeBar deadline={game.deadline} total={a.bids.length ? AUCTION_MS.bid : AUCTION_MS.start} />

            <div className="flex gap-1">
              {QUICK_BIDS.map((d) => (
                <Button key={d} className="flex-1 tabular-nums" disabled={!canBid || a.bid + d > myCash} onClick={() => send({ type: "bid", amount: d })}>
                  +${d}
                </Button>
              ))}
            </div>

            <div className="overflow-y-auto bg-muted p-2 text-muted-foreground flex flex-col gap-1 h-[6rem]">
              {a.bids.length === 0 && <div>{t("auction.noBids")}</div>}
              {[...a.bids].reverse().map((b, i) => (
                <div className="flex items-center gap-1 leading-none text-xs" key={a.bids.length - i}>
                  <b className="text-foreground">{names[b.pid]}</b> - <span className={i == 0 ? 'tabular-nums text-warning' : 'text-muted-foreground'}>${b.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
            <TileDetails index={a.tile} game={game} />
          </div>
        </div>
      </div>
    </div>
  );
}
