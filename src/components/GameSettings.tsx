import type { GameSettings, PublicState } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/store";
import { send } from "@/lib/ws";

// Lobby screen: richup-style settings. Host edits, everyone sees live.

const TOGGLES: { key: keyof GameSettings; label: string; desc: string }[] = [
  { key: "doubleRentFullSet", label: "x2 rent on full-set properties", desc: "Se possiedi un set completo, l'affitto base raddoppia" },
  { key: "vacationCash", label: "Vacation cash", desc: "Tasse e pagamenti alla banca si accumulano su Free Parking: chi ci atterra incassa" },
  { key: "auction", label: "Auction", desc: "Se rifiuti l'acquisto, la proprietà va all'asta" },
  { key: "noRentInPrison", label: "Don't collect rent while in prison", desc: "Niente affitto se il proprietario è in prigione" },
  { key: "mortgageAllowed", label: "Mortgage", desc: "Ipoteca le proprietà per il 50% del costo" },
  { key: "evenBuild", label: "Even build", desc: "Case e hotel vanno costruiti/venduti in modo uniforme nel set" },
  { key: "randomOrder", label: "Randomize player order", desc: "Ordine dei giocatori casuale a inizio partita" },
];

export function GameSettingsView({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const isHost = game.players[0]?.id === myId;
  const st = game.settings;
  const patch = (settings: Partial<GameSettings>) => send({ type: "updateSettings", settings });

  return (
    <div className="w-full max-w-lg space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-bold text-indigo-300">Game settings</h2>
      {!isHost && <p className="text-xs text-slate-400">Solo l'host ({game.players[0]?.name}) può modificare le impostazioni.</p>}

      <label className="flex items-center justify-between gap-4 text-sm">
        <div>
          <div className="font-medium">Maximum players</div>
          <div className="text-xs text-slate-400">Quanti giocatori possono entrare</div>
        </div>
        <select
          className="h-8 rounded-md border border-white/10 bg-[#1a1a35] px-2 text-sm"
          value={st.maxPlayers}
          disabled={!isHost}
          onChange={(e) => patch({ maxPlayers: Number(e.target.value) })}
        >
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between gap-4 text-sm">
        <div>
          <div className="font-medium">Starting cash</div>
          <div className="text-xs text-slate-400">Soldi iniziali di ogni giocatore</div>
        </div>
        <select
          className="h-8 rounded-md border border-white/10 bg-[#1a1a35] px-2 text-sm"
          value={st.startingCash}
          disabled={!isHost}
          onChange={(e) => patch({ startingCash: Number(e.target.value) })}
        >
          {[500, 1000, 1500, 2000, 2500, 3000].map((n) => (
            <option key={n} value={n}>
              ${n}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        {TOGGLES.map(({ key, label, desc }) => (
          <label key={key} className="flex cursor-pointer items-start justify-between gap-4 text-sm">
            <div>
              <div className="font-medium">{label}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </div>
            <input
              type="checkbox"
              className="mt-1 size-4 accent-indigo-500"
              checked={Boolean(st[key])}
              disabled={!isHost}
              onChange={(e) => patch({ [key]: e.target.checked })}
            />
          </label>
        ))}
      </div>

      <Button className="w-full rounded-md" disabled={!isHost || game.players.length < 2} onClick={() => send({ type: "start" })}>
        {game.players.length < 2 ? "In attesa di giocatori…" : "Start game"}
      </Button>
    </div>
  );
}
