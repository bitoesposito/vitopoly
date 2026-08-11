import { ArrowLeft, ChevronDown, Share2 } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { PlayerList } from "@/components/panels/PlayerList";
import { Rules } from "@/components/lobby/Rules";
import { Identity } from "@/components/lobby/Identity";
import { InstallaApp } from "@/components/InstallaApp";
import { useGame } from "@/lib/store";
import { translate as t } from "@/lib/i18n";
import { send, torna } from "@/lib/net/client";
import { shareInvite } from "@/lib/share";

// Sala d'attesa, non un cruscotto: colonna sola e centrata, sezioni separate da un
// filetto e non da una cornice — card di peso uguale appiattivano ogni gerarchia.
const LABEL = "font-condensed text-micro tracking-widest text-muted-foreground uppercase";

export function PreMatch({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const code = useGame((s) => s.code);
  const isHost = game.players[0]?.id === myId;
  const alone = game.players.length < 2;

  return (
    // stesso ritmo della home (Lobby): gutter 5, sezioni 5, dentro 2, dopo un filetto 3
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 p-5">
      {/* Qui indietro vuol dire una cosa sola: lascio la stanza. Il posto si libera davvero,
          ma la stanza resta e la home offre il rientro — quindi niente conferma a due tocchi.
          Il link da condividere ce l'ha già la sezione dei giocatori. */}
      <Button
        size="sm"
        variant="ghost"
        className="-ml-2.5 self-start text-muted-foreground"
        onClick={() => {
          send({ type: "leave" });
          setTimeout(() => torna(false), 300);
        }}
      >
        <ArrowLeft />
        {t("room.leave")}
      </Button>

      <section className="space-y-2">
        <h2 className={LABEL}>{t("id.title")}</h2>
        <Identity game={game} />
      </section>

      <section className="space-y-2 border-t border-border pt-3">
        <h2 className={LABEL}>{t("players.title", { n: game.players.length })}</h2>
        <PlayerList game={game} />
        <button
          onClick={() => shareInvite(code)}
          className={`flex w-full items-center justify-between gap-3 border p-3 text-left transition-colors hover:bg-accent ${alone ? "animate-pulse border-ring bg-accent/60" : "border-border bg-accent/30"}`}
        >
          <div>
            <div className="font-medium">{t("settings.invite")}</div>
            <div className="text-xs text-muted-foreground">{alone ? t("settings.inviteAlone") : t("settings.inviteDesc")}</div>
          </div>
          {/* il codice sta qui perché è la sezione dell'invito, e in standalone non c'è un
              indirizzo da leggere: senza, non puoi dire a voce in quale stanza sei */}
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-micro tracking-widest text-muted-foreground uppercase">N. {code}</span>
            <Share2 className="size-4" />
          </span>
        </button>
      </section>

      {/* l'avvio chiude il percorso */}
      <div className="space-y-2">
        <Button className="w-full" size="lg" disabled={!isHost || alone} onClick={() => send({ type: "start" })}>
          {alone ? t("settings.waiting") : t("settings.start")}
        </Button>
        {!isHost && (
          <p className="text-center text-xs text-muted-foreground">{t("settings.hostStarts", { name: game.players[0]?.name ?? "" })}</p>
        )}
      </div>

      {/* qui si aspetta: è il solo momento in cui proporre l'installazione non interrompe niente */}
      <InstallaApp />

      {/* consultazione, non un passo: in fondo e chiusa, come nella home */}
      <details className="group border-t border-border pt-3">
        <summary className={`flex cursor-pointer list-none items-center justify-between ${LABEL} [&::-webkit-details-marker]:hidden`}>
          {t("rules.title")}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-3">
          <Rules />
        </div>
      </details>
    </div>
  );
}
