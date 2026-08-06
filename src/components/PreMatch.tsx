import { ChevronDown, Share2 } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { PlayerList } from "@/components/PlayerList";
import { Regole } from "@/components/Regole";
import { Identita } from "@/components/Identita";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { shareInvite } from "@/lib/share";

// Schermata pre-partita. Stessa lingua della home: nessuna card, sezioni separate
// da un filetto, etichette in maiuscoletto spaziato. Le impostazioni non esistono
// più — né qui né sul filo — e i posti non hanno tetto.
const ETICHETTA = "font-condensed text-micro tracking-widest text-muted-foreground uppercase";

export function PreMatch({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const code = useGame((s) => s.code);
  const t = useT();
  const isHost = game.players[0]?.id === myId;
  const alone = game.players.length < 2;

  return (
    // Colonna sola, stretta e centrata: è una sala d'attesa, non un cruscotto.
    // Il ritmo lo fa il contrasto — 32px fra le sezioni, 8px dentro — e a separarle
    // è un filetto, non una cornice: quattro card di peso uguale erano il motivo per
    // cui niente sembrava più importante di nient'altro.
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 p-5">
      <section className="space-y-3">
        <h2 className={ETICHETTA}>{t("id.title")}</h2>
        <Identita game={game} />
      </section>

      <section className="space-y-3 border-t border-border pt-8">
        <h2 className={ETICHETTA}>{t("players.title", { n: game.players.length })}</h2>
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
      </section>

      {/* l'avvio chiude il percorso */}
      <div className="space-y-2">
        <Button className="w-full" size="lg" disabled={!isHost || alone} onClick={() => send({ type: "start" })}>
          {alone ? t("settings.waiting") : t("settings.start")}
        </Button>
        {!isHost && <p className="text-center text-xs text-muted-foreground">{t("settings.hostStarts", { name: game.players[0]?.name ?? "" })}</p>}
      </div>

      {/* consultazione, non un passo: in fondo e chiusa, come nella home */}
      <details className="group border-t border-border pt-4">
        <summary className={`flex cursor-pointer list-none items-center justify-between ${ETICHETTA} [&::-webkit-details-marker]:hidden`}>
          {t("rules.title")}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-4">
          <Regole />
        </div>
      </details>
    </div>
  );
}
