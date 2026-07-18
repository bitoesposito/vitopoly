import { useEffect } from "react";
import { ChevronDown, Share2 } from "lucide-react";
import type { GameSettings, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerList } from "@/components/PlayerList";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { shareInvite } from "@/lib/share";

// Lobby screen: game settings. Host edits, everyone sees live.
// Toggles are phrased so that OFF = default rules; `invert` flips the wire value,
// so a rule that defaults to true reads as an opt-in deviation ("Niente aste").
// i18n keys derive from `key`: settings.<key> / settings.<key>Desc.

type Toggle = { key: keyof GameSettings; invert?: boolean };

const SECTIONS: { titleKey: string; toggles: Toggle[] }[] = [
  { titleKey: "settings.sec.game", toggles: [{ key: "randomOrder", invert: true }] },
  {
    titleKey: "settings.sec.property",
    toggles: [{ key: "auction", invert: true }, { key: "mortgageAllowed", invert: true }, { key: "evenBuild" }],
  },
  { titleKey: "settings.sec.rent", toggles: [{ key: "doubleRentFullSet", invert: true }, { key: "noRentInPrison" }] },
  { titleKey: "settings.sec.extra", toggles: [{ key: "vacationCash", invert: true }] },
];

let autoCopied: string | null = null;

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
  const code = useGame((s) => s.code);
  const t = useT();
  const isHost = game.players[0]?.id === myId;
  const st = game.settings;
  const patch = (settings: Partial<GameSettings>) => send({ type: "updateSettings", settings });
  const alone = game.players.length < 2;

  // landing on settings auto-copies the invite link (silent, no native share);
  // module-level guard: once per room, StrictMode/remounts don't double-copy
  useEffect(() => {
    if (!code || autoCopied === code) return;
    autoCopied = code;
    shareInvite(code, true);
  }, [code]);

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 p-3">
      {/* card 1: giocatori + invito */}
      <Card>
        <CardHeader>
          <CardTitle>{t("players.title", { n: game.players.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PlayerList game={game} />
          <button
            onClick={() => shareInvite(code)}
            className={`flex w-full items-center justify-between gap-3 border p-3 text-left transition-colors hover:bg-accent ${alone ? "animate-pulse border-ring bg-accent/60" : "border-border bg-accent/30"}`}
          >
            <div>
              <div className="font-medium">{t("settings.invite")}</div>
              <div className="text-xs text-muted-foreground">{alone ? t("settings.inviteAlone") : t("settings.inviteDesc")}</div>
            </div>
            <Share2 className="size-4 shrink-0" />
          </button>
        </CardContent>
      </Card>

      {/* card 2: impostazioni collassabili — native <details>, niente dep accordion */}
      <Card>
        <CardContent>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
              {t("settings.title")}
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-5 pt-4">
              {!isHost && <p className="text-xs text-muted-foreground">{t("settings.hostOnly", { name: game.players[0]?.name ?? "" })}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberSetting label={t("settings.maxPlayers")} desc={t("settings.maxPlayersDesc")} value={st.maxPlayers} options={[2, 3, 4, 5, 6, 7, 8]} disabled={!isHost} onChange={(n) => patch({ maxPlayers: n })} />
                <NumberSetting label={t("settings.startingCash")} desc={t("settings.startingCashDesc")} value={st.startingCash} options={[500, 1000, 1500, 2000, 2500, 3000]} prefix="$" disabled={!isHost} onChange={(n) => patch({ startingCash: n })} />
              </div>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {SECTIONS.map(({ titleKey, toggles }) => (
                  <section key={titleKey} className="space-y-2.5 border-t border-border pt-3">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(titleKey)}</h3>
                    {toggles.map(({ key, invert }) => (
                      <Label key={key} className="flex cursor-pointer items-start justify-between gap-4 text-sm font-normal">
                        <div>
                          <div className="font-medium">{t(`settings.${key}`)}</div>
                          <div className="text-xs text-muted-foreground">{t(`settings.${key}Desc`)}</div>
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
            </div>
          </details>
        </CardContent>
      </Card>

      {/* card 3: avvio */}
      <Button className="w-full" disabled={!isHost || alone} onClick={() => send({ type: "start" })}>
            {alone ? t("settings.waiting") : t("settings.start")}
          </Button>
    </div>
  );
}
