import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Lobby } from "@/components/Lobby";
import { GameSettingsView } from "@/components/GameSettings";
import { Board } from "@/components/Board";
import { GamePanels } from "@/components/Panels";
import { Chat, Sidebar } from "@/components/Sidebar";

export default function App() {
  const game = useGame((s) => s.game);
  const connected = useGame((s) => s.connected);
  const myId = useGame((s) => s.myId);
  const t = useT();

  // ws.ts reconnects on its own; just show a banner while offline
  if (!game) return <Lobby />;

  const spectator = !game.players.some((p) => p.id === myId); // joined after the game started

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground md:flex-row">
      {!connected && (
        <div className="fixed inset-x-0 top-0 z-50 bg-warning py-1 text-center text-xs font-semibold text-black">
          {t("net.reconnecting")}
        </div>
      )}
      {connected && spectator && (
        <div className="fixed inset-x-0 top-0 z-40 bg-muted py-1 text-center text-xs font-semibold text-muted-foreground">
          {t("spec.banner")}
        </div>
      )}
      {/* panels render twice with responsive visibility: mobile below the board, desktop in the Sidebar */}
      {/* quando c'è spazio a sinistra della board quadrata (2xl+), la chat ha una colonna sua */}
      <aside className="hidden w-80 shrink-0 flex-col p-2 2xl:flex">
        <Chat open />
      </aside>
      <main className="min-h-0 max-h-[100vh] flex-1 overflow-auto">
        {/* md:p-2 = stesso gutter dal bordo pagina delle sidebar */}
        <div className="flex flex-col items-center justify-center gap-3 sm:h-full md:p-2">
          {game.status === "lobby" ? (
            <GameSettingsView game={game} />
          ) : (
            <>
              <Board game={game} />
              <div className="w-full md:hidden">
                <GamePanels game={game}/>
              </div>
            </>
          )}
        </div>
      </main>
      <Sidebar game={game} />
    </div>
  );
}
