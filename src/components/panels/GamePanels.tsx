import type { PublicState } from "@tangentopoly/game";
import { useGame } from "@/lib/store";
import { Panel } from "./Panel";
import { PlayerList } from "./PlayerList";
import { AuctionPanel } from "./AuctionPanel";
import { AssetsPanel } from "./AssetsPanel";
import { TradePanel } from "./trade/TradePanel";

// La colonna destra. Montata due volte con visibilità responsive: sotto la plancia su
// mobile (App.tsx), nella sidebar da md in su.
export function GamePanels({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);

  return (
    <div className="flex w-full flex-col gap-2">
      <Panel>
        <PlayerList game={game} />
      </Panel>
      {/* asta: desktop tra giocatori e scambi; mobile in cima, subito sotto la plancia */}
      <AuctionPanel game={game} />
      <TradePanel game={game} myId={myId} />
      <AssetsPanel game={game} myId={myId} />
    </div>
  );
}
