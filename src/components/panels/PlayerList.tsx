import { Briefcase, Check, Crown, Lock, MonitorSmartphone, Ticket, UserX, WifiOff } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { useGame } from "@/lib/store";
import { translate as t } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { TOKEN_COLOR, tokenLetter } from "@/lib/palette";
import { euro } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { copySeatLink } from "@/lib/share";

// la stessa marca che sta sulla pedina
const stamp = (token: number) => (
  <span
    className="flex size-4 shrink-0 items-center justify-center font-mono text-micro leading-none ring-1 ring-paper-ink/50"
    style={{ background: TOKEN_COLOR[token % 8], color: "var(--color-paper-ink)" }}
  >
    {tokenLetter(token)}
  </span>
);

const isTurn = (game: PublicState, pid: string) => game.status === "playing" && game.players[game.current]?.id === pid;

// Riga: timbro | nome | stato (host/prigione/carte/offline) | voti+kick | cash.
// Cash sempre ultima colonna -> allineata su tutte le righe; il kick compare
// in hover (sempre visibile su touch) per non sporcare la lista.
export function PlayerList({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const code = useGame((s) => s.code);
  const canVote = game.players.some((p) => p.id === myId && !p.bankrupt); // spettatori e falliti non votano
  return (
    <div className="space-y-0.5">
      {game.players.map((p, i) => (
        <div
          key={p.id}
          className={`group flex items-center gap-1.5 px-2 py-1 text-xs transition-colors ${
            isTurn(game, p.id) ? "bg-accent text-accent-foreground ring-1 ring-ring" : ""
          } ${p.bankrupt ? "opacity-60" : ""}`}
        >
          {stamp(p.token)}
          <span className={`min-w-0 truncate font-medium ${p.bankrupt ? "line-through" : ""}`}>
            {p.name}
            {p.id === myId && <span className="font-normal text-muted-foreground"> {t("players.you")}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
            {p.bankrupt && (
              <span className="border-y border-sanguigna px-1 font-condensed text-micro tracking-widest text-sanguigna uppercase">
                {t("players.out")}
              </span>
            )}
            {i === 0 && <Crown className="size-3.5 text-warning" aria-label={t("aria.host")} />}
            {p.inJail && <Lock className="size-3.5" aria-label={t("aria.jail")} />}
            {p.jailCards > 0 && (
              <span className="flex items-center gap-0.5 text-2xs">
                <Ticket className="size-3.5" aria-label={t("aria.jailCards")} />×{p.jailCards}
              </span>
            )}
            {!p.connected && <WifiOff className="size-3.5" aria-label={t("aria.disconnected")} />}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {(game.kickVotes[p.id]?.length ?? 0) > 0 && (
              <span className="text-2xs tabular-nums text-destructive">
                {game.kickVotes[p.id]!.length}/{game.players.filter((x) => !x.bankrupt && x.id !== p.id).length}
              </span>
            )}
            {game.status === "playing" && canVote && (
              !p.bankrupt && p.id !== myId ? (
                // il voto può essere quello decisivo: due tocchi, non uno
                <ConfirmButton
                  size="icon-sm"
                  variant="ghost"
                  className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 pointer-coarse:opacity-100"
                  title={t("kick.vote", { name: p.name })}
                  aria-label={t("kick.vote", { name: p.name })}
                  disabled={(game.kickVotes[p.id] ?? []).includes(myId)}
                  label={<UserX className="size-3.5" />}
                  armedLabel={<Check className="size-3.5" />}
                  armedAriaLabel={t("kick.sure")}
                  onConfirm={() => send({ type: "votekick", target: p.id })}
                />
              ) : p.id === myId && code ? (
                // La riga tua è l'unica senza espulsione: quello slot era vuoto, e il
                // trasferimento del posto riguarda esattamente te. Un'icona sola in tutta
                // la lista, sempre visibile: è la via d'uscita se cambi dispositivo.
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  title={t("seat.move")}
                  aria-label={t("seat.move")}
                  onClick={() => copySeatLink(code, myId)}
                >
                  <MonitorSmartphone className="size-3.5" />
                </Button>
              ) : (
                <span className="size-8 shrink-0" /> // slot riservato: cash allineata su tutte le righe
              )
            )}
            {game.status !== "lobby" && <span className="font-mono tabular-nums text-success">{euro(p.cash)}</span>}
          </span>
        </div>
      ))}
      {game.status === "playing" && game.settings.vacationCash && (
        <div className="flex items-center gap-1.5 border-t border-border px-2 pt-1.5 text-xs text-muted-foreground">
          <Briefcase className="size-3.5" /> {t("players.vacationPot")}
          <span className="ml-auto font-mono tabular-nums text-warning">{euro(game.vacationPot)}</span>
        </div>
      )}
    </div>
  );
}
