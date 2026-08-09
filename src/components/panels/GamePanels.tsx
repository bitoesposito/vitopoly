import type { PublicState } from "@tangentopoly/game";
import { ConfirmButton } from "@/components/ConfirmButton";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { useGame } from "@/lib/store";
import { auctionLive } from "@/lib/selectors";
import { Panel } from "./Panel";
import { PlayerList } from "./PlayerList";
import { AuctionPanel } from "./AuctionPanel";
import { AssetsPanel } from "./AssetsPanel";
import { TradePanel } from "./trade/TradePanel";

// La colonna destra. Montata due volte con visibilità responsive: sotto la plancia su
// mobile (App.tsx), nella sidebar da md in su.
export function GamePanels({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const t = useT();
  const me = game.players.find((p) => p.id === myId);
  // il ritiro volontario è legale sempre — il motore lo blocca solo in asta
  const canQuit = game.status === "playing" && !!me && !me.bankrupt && !auctionLive(game);

  return (
    <div className="flex w-full flex-col gap-2">
      <Panel>
        <PlayerList game={game} />
      </Panel>
      {/* asta: desktop tra giocatori e scambi; mobile in cima, subito sotto la plancia */}
      <AuctionPanel game={game} />
      <TradePanel game={game} myId={myId} />
      <AssetsPanel game={game} myId={myId} />
      {/* stessa dignità di roster, scambi e proprietà: è l'azione più distruttiva del gioco */}
      {canQuit && (
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{t("debt.bankruptHint")}</span>
            <ConfirmButton
              size="sm"
              variant="destructive"
              className="shrink-0 pointer-coarse:min-h-11"
              label={t("debt.bankrupt")}
              armedLabel={t("debt.bankruptSure")}
              onConfirm={() => send({ type: "bankrupt" })}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
