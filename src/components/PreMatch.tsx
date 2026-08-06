import { ChevronDown, Share2 } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerList } from "@/components/PlayerList";
import { Regole } from "@/components/Regole";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { shareInvite } from "@/lib/share";

// Schermata pre-partita: chi c'è, come si invita, come si gioca, e il via.
// Le impostazioni non esistono più — né qui né sul filo (updateSettings è stata
// tolta dal protocollo). Si gioca con il regolamento della casa, uguale per tutti,
// e i posti non hanno tetto: chi arriva prima dell'inizio si siede.
export function PreMatch({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const code = useGame((s) => s.code);
  const t = useT();
  const isHost = game.players[0]?.id === myId;
  const alone = game.players.length < 2;

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

      {/* card 2: il regolamento della casa, che è anche l'unico posto dove le regole
          si leggono — non essendoci più interruttori, questa è la fonte */}
      <Card>
        <CardContent>
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
              {t("rules.title")}
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="pt-4">
              <Regole />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* card 3: avvio */}
      <div className="space-y-1.5">
        <Button className="w-full" size="lg" disabled={!isHost || alone} onClick={() => send({ type: "start" })}>
          {alone ? t("settings.waiting") : t("settings.start")}
        </Button>
        {/* il motivo per cui il bottone è spento stava dentro un <details> chiuso */}
        {!isHost && <p className="text-center text-xs text-muted-foreground">{t("settings.hostStarts", { name: game.players[0]?.name ?? "" })}</p>}
      </div>
    </div>
  );
}
