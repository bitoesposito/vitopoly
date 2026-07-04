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
    <div className="flex h-dvh flex-col bg-[#0d0d22] text-slate-100 lg:flex-row">
      <main className="grid min-h-0 flex-1 place-items-center overflow-auto p-2">
        {game.status === "lobby" ? <GameSettingsView game={game} /> : <Board game={game} />}
      </main>
      <Sidebar game={game} />
    </div>
  );
}
