import type { GameSettings, PublicState } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGame } from "@/lib/store";
import { send } from "@/lib/ws";

// Lobby screen: game settings. Host edits, everyone sees live.
// Toggles are phrased so that OFF = default rules; `invert` flips the wire value,
// so a rule that defaults to true reads as an opt-in deviation ("Niente aste").

type Toggle = { key: keyof GameSettings; label: string; desc: string; invert?: boolean };

const SECTIONS: { title: string; toggles: Toggle[] }[] = [
  {
    title: "Partita",
    toggles: [
      { key: "randomOrder", label: "Ordine fisso", desc: "Turni in ordine di ingresso invece che casuale", invert: true },
    ],
  },
  {
    title: "Proprietà",
    toggles: [
      { key: "auction", label: "Niente aste", desc: "Se rifiuti l'acquisto, la proprietà resta alla banca", invert: true },
      { key: "mortgageAllowed", label: "Niente ipoteche", desc: "Vietato ipotecare le proprietà", invert: true },
      { key: "evenBuild", label: "Costruzione uniforme", desc: "Case e hotel costruiti/venduti in modo uniforme nel set" },
    ],
  },
  {
    title: "Affitti",
    toggles: [
      { key: "doubleRentFullSet", label: "Niente x2 sui set completi", desc: "Affitto base anche possedendo il set completo", invert: true },
      { key: "noRentInPrison", label: "Niente affitto in prigione", desc: "Il proprietario in prigione non incassa affitti" },
    ],
  },
  {
    title: "Extra",
    toggles: [
      { key: "vacationCash", label: "Niente vacation cash", desc: "Tasse e pagamenti restano alla banca invece di accumularsi su Free Parking", invert: true },
    ],
  },
];

function NumberSetting({ label, desc, value, options, prefix, disabled, onChange }: {
  label: string; desc: string; value: number; options: number[]; prefix?: string; disabled: boolean; onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Select value={String(value)} disabled={disabled} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger size="sm" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {prefix}{n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function GameSettingsView({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const isHost = game.players[0]?.id === myId;
  const st = game.settings;
  const patch = (settings: Partial<GameSettings>) => send({ type: "updateSettings", settings });

  return (
    <Card className="m-auto w-full lg:max-w-2xl w-full lg:h-fit h-full">
      <CardHeader>
        <CardTitle>Impostazioni partita</CardTitle>
        {!isHost && <p className="text-xs text-muted-foreground">Solo l'host ({game.players[0]?.name}) può modificare le impostazioni.</p>}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <NumberSetting label="Giocatori max" desc="Quanti possono entrare" value={st.maxPlayers} options={[2, 3, 4, 5, 6, 7, 8]} disabled={!isHost} onChange={(n) => patch({ maxPlayers: n })} />
          <NumberSetting label="Soldi iniziali" desc="Cash di partenza a testa" value={st.startingCash} options={[500, 1000, 1500, 2000, 2500, 3000]} prefix="$" disabled={!isHost} onChange={(n) => patch({ startingCash: n })} />
        </div>

        <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
          {SECTIONS.map(({ title, toggles }) => (
            <section key={title} className="space-y-2.5 border-t border-border pt-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
              {toggles.map(({ key, label, desc, invert }) => (
                <Label key={key} className="flex cursor-pointer items-start justify-between gap-4 text-sm font-normal">
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <Switch
                    checked={invert ? !st[key] : Boolean(st[key])}
                    disabled={!isHost}
                    onCheckedChange={(c) => patch({ [key]: invert ? !c : c })}
                  />
                </Label>
              ))}
            </section>
          ))}
        </div>

        <Button className="w-full" disabled={!isHost || game.players.length < 2} onClick={() => send({ type: "start" })}>
          {game.players.length < 2 ? "In attesa di giocatori…" : "Inizia partita"}
        </Button>
      </CardContent>
    </Card>
  );
}
