import { useGame } from "@/lib/store";
import { Lobby } from "@/components/Lobby";
import { GameSettingsView } from "@/components/GameSettings";
import { Board } from "@/components/Board";
import { Sidebar } from "@/components/Sidebar";

export default function App() {
  const game = useGame((s) => s.game);
  const connected = useGame((s) => s.connected);

  if (!game || !connected) return <Lobby />;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground lg:flex-row">
      {/* main scrolla; wrapper min-h-full cresce col contenuto → centra se ci sta, scrolla se no (niente cutoff flex) */}
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="flex justify-center">
          {game.status === "lobby" ? <GameSettingsView game={game} /> : <Board game={game} />}
        </div>
      </main>
      <Sidebar />
    </div>
  );
}
