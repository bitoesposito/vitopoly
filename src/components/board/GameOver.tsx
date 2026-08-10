import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { TokenStamp } from "@/components/TokenStamp";
import { translate as t } from "@/lib/i18n";
import { netWorth, playerNames } from "@/lib/selectors";
import { euro } from "@/lib/format";
import { send } from "@/lib/net/client";

// Fine partita: la classifica per patrimonio, e una porta per rigiocare.
export function GameOver({ game }: { game: PublicState }) {
  const names = playerNames(game);
  const standings = [...game.players].sort((a, b) => netWorth(game, b.id) - netWorth(game, a.id));

  return (
    <div className="tratteggio grid h-full place-items-center overflow-y-auto bg-card p-3 font-condensed">
      <div className="w-full max-w-xs text-center">
        <h2 className="text-2xl font-bold text-warning">
          {t("center.winner", { name: game.winner ? names[game.winner] : t("center.nobody") })}
        </h2>
        <ol className="mt-4 space-y-1 text-left text-xs">
          {standings.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 border-b border-border pb-1">
              <span className="w-4 font-mono text-muted-foreground tabular-nums">{i + 1}</span>
              <TokenStamp token={p.token} />
              <span className={`min-w-0 truncate ${p.bankrupt ? "text-muted-foreground line-through" : ""}`}>{p.name}</span>
              <span className="ml-auto font-mono text-success tabular-nums">{euro(netWorth(game, p.id))}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2 text-micro tracking-wide text-muted-foreground uppercase">{t("end.worth")}</div>
        {/* Due uscite, non una: si resta al tavolo (la stanza torna in sala d'attesa con
            questi giocatori, chiunque può farlo) o si smonta tutto e si torna alla home.
            La rivincita è la strada normale, quindi è l'unica in evidenza. */}
        <div className="mt-4 space-y-2">
          <Button size="lg" className="w-full" onClick={() => send({ type: "rematch" })}>
            {t("end.rematch")}
          </Button>
          <Button size="lg" variant="outline" className="w-full" onClick={() => (location.href = location.origin + location.pathname)}>
            {t("end.home")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("end.rematchHint")}</p>
        </div>
      </div>
    </div>
  );
}
