import { useGame } from "@/lib/store";
import { Lobby } from "@/components/Lobby";
import { GameSettingsView } from "@/components/GameSettings";
import { Board } from "@/components/Board";
import { GamePanels } from "@/components/Panels";
import { Sidebar } from "@/components/Sidebar";

export default function App() {
  const game = useGame((s) => s.game);
  const connected = useGame((s) => s.connected);

  if (!game || !connected) return <Lobby />;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground md:flex-row">
      {/* ponytail: i pannelli si rendono due volte con visibilità responsive — mobile qui sotto
          il tabellone (fuori dal bottom-sheet chat), desktop dentro la Sidebar accanto alla chat. */}
      <main className="min-h-0 max-h-[100vh] flex-1 overflow-auto">
        <div className="flex flex-col items-center justify-center gap-3 sm:h-full">
          {game.status === "lobby" ? (
            <GameSettingsView game={game} />
          ) : (
            <>
              <Board game={game} />
              <div className="w-full md:hidden">
                <GamePanels game={game} />
              </div>
            </>
          )}
        </div>
      </main>
      <Sidebar game={game} />
    </div>
  );
}
