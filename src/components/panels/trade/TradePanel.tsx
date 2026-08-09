import { useEffect, useRef } from "react";
import { ArrowLeft, Handshake, Plus } from "lucide-react";
import { toast } from "sonner";
import type { PublicState, Trade } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { useGame } from "@/lib/store";
import { auctionLive, playerNames } from "@/lib/selectors";
import { Panel } from "../Panel";
import { BundleChips } from "../BundleChips";
import { TradeComposer } from "./TradeComposer";

// Pannello navigabile: lista <-> dettaglio. Una proposta nuova apre da sola il dettaglio
// e resta listata (con "Mostra") finché non si conclude.
export function TradePanel({ game, myId }: { game: PublicState; myId: string }) {
  const tr = useT();
  const tradeOpen = useGame((s) => s.tradeOpen);
  const hidden = useGame((s) => s.tradeHidden);
  useIncomingToast(game, myId);

  const inAuction = auctionLive(game); // il motore vieta gli scambi in asta
  const me = game.players.find((p) => p.id === myId); // spettatori e falliti non scambiano
  const incoming = game.trades.filter((t) => t.to === myId);
  const outgoing = game.trades.filter((t) => t.from === myId);
  const names = playerNames(game);
  const setHidden = (id: string, v: boolean) => useGame.setState((s) => ({ tradeHidden: { ...s.tradeHidden, [id]: v } }));

  const compose = !inAuction && tradeOpen;
  const detail = !inAuction && !compose ? incoming.find((t) => !hidden[t.id]) : undefined;
  const back = () => (compose ? useGame.setState({ tradeOpen: false }) : detail && setHidden(detail.id, true));

  return (
    <Panel ring={compose || detail ? "ring-2 ring-success/50" : undefined}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {compose || detail ? (
            <Button size="icon-xs" variant="ghost" aria-label={tr("trade.back")} onClick={back}>
              <ArrowLeft className="size-3.5" />
            </Button>
          ) : (
            <Handshake className="size-3.5" />
          )}
          {compose ? tr("trade.propose") : detail ? tr("trade.incoming", { name: names[detail.from] }) : tr("trade.title")}
        </span>
        {!compose && !detail && (
          <Button size="xs" disabled={inAuction || !me || me.bankrupt} onClick={() => useGame.setState({ tradeOpen: true })}>
            <Plus className="size-3.5" />
            {tr("trade.create")}
          </Button>
        )}
      </div>

      <div key={compose ? "compose" : (detail?.id ?? "list")} className="space-y-2 duration-300 animate-in fade-in slide-in-from-top-1">
        {compose ? (
          <TradeComposer game={game} myId={myId} />
        ) : detail ? (
          <IncomingTrade trade={detail} />
        ) : (
          <>
            {incoming.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {tr("trade.incomingRow", { name: names[t.from] })}
                <Button size="xs" variant="ghost" disabled={inAuction} onClick={() => setHidden(t.id, false)}>
                  {tr("trade.show")}
                </Button>
              </div>
            ))}
            {outgoing.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {tr("trade.waiting", { name: names[t.to] })}
                <Button size="xs" variant="ghost" onClick={() => send({ type: "cancelTrade", id: t.id })}>
                  {tr("trade.cancel")}
                </Button>
              </div>
            ))}
          </>
        )}
      </div>
    </Panel>
  );
}

// L'offerta di qualcun altro, letta dal MIO punto di vista: il suo `give` è ciò che ricevo.
function IncomingTrade({ trade }: { trade: Trade }) {
  const tr = useT();
  return (
    <>
      <div className="h-1.5 rounded-full bg-success/50" />
      <div className="space-y-2 text-sm">
        <div className="space-y-1">
          <div className="text-2xs font-semibold tracking-wide uppercase text-success">{tr("trade.youGet")}</div>
          <BundleChips b={trade.give} />
        </div>
        <div className="space-y-1">
          <div className="text-2xs font-semibold tracking-wide uppercase text-destructive">{tr("trade.youGive")}</div>
          <BundleChips b={trade.get} />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" className="flex-1" onClick={() => send({ type: "respondTrade", id: trade.id, accept: true })}>
          {tr("trade.accept")}
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => send({ type: "respondTrade", id: trade.id, accept: false })}>
          {tr("trade.reject")}
        </Button>
      </div>
    </>
  );
}

// Su mobile la proposta arriva sotto la piega, dentro un timer da 60s: il toast è
// l'unico modo di accorgersene.
function useIncomingToast(game: PublicState, myId: string): void {
  const tr = useT();
  const seen = useRef<string[]>([]);
  useEffect(() => {
    const mine = game.trades.filter((t) => t.to === myId);
    const fresh = mine.filter((t) => !seen.current.includes(t.id));
    seen.current = mine.map((t) => t.id);
    for (const t of fresh) toast(tr("trade.incoming", { name: game.players.find((p) => p.id === t.from)?.name ?? "" }));
  }, [game.trades, game.players, myId, tr]);
}
