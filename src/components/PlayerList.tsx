import { Crown, Lock, Palmtree, Ticket, UserX, WifiOff } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { TOKEN_COLOR } from "@/lib/colors";
import { Button } from "@/components/ui/button";

const dot = (token: number) => (
  <span className="size-3 shrink-0 rounded-full ring-1 ring-black/40" style={{ background: TOKEN_COLOR[token % 8] }} />
);

const isTurn = (game: PublicState, pid: string) => game.status === "playing" && game.players[game.current]?.id === pid;

// Riga: dot | nome | stato (host/prigione/carte/offline) | voti+kick | cash.
// Cash sempre ultima colonna -> allineata su tutte le righe; il kick compare
// in hover (sempre visibile su touch) per non sporcare la lista.
export function PlayerList({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const t = useT();
  const canVote = game.players.some((p) => p.id === myId && !p.bankrupt); // spectators/bankrupt can't kick
  return (
    <div className="space-y-0.5">
      {game.players.map((p, i) => (
        <div
          key={p.id}
          className={`group flex items-center gap-1.5 px-2 py-1 text-xs transition-colors ${
            isTurn(game, p.id) ? "bg-accent text-accent-foreground ring-1 ring-ring" : ""
          } ${p.bankrupt ? "opacity-40" : ""}`}
        >
          {dot(p.token)}
          <span className={`min-w-0 truncate font-medium ${p.bankrupt ? "line-through" : ""}`}>
            {p.name}
            {p.id === myId && <span className="font-normal text-muted-foreground"> {t("players.you")}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
            {i === 0 && <Crown className="size-3.5 text-warning" aria-label={t("aria.host")} />}
            {p.inJail && <Lock className="size-3.5" aria-label={t("aria.jail")} />}
            {p.jailCards > 0 && (
              <span className="flex items-center gap-0.5 text-2xs">
                <Ticket className="size-3.5" />×{p.jailCards}
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
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 pointer-coarse:opacity-100"
                  title={t("kick.vote", { name: p.name })}
                  disabled={(game.kickVotes[p.id] ?? []).includes(myId)}
                  onClick={() => send({ type: "votekick", target: p.id })}
                >
                  <UserX className="size-3.5" />
                </Button>
              ) : (
                <span className="size-5 shrink-0" /> // slot riservato: cash allineata su tutte le righe
              )
            )}
            {game.status !== "lobby" && <span className="tabular-nums text-success">${p.cash}</span>}
          </span>
        </div>
      ))}
      {game.status === "playing" && game.settings.vacationCash && (
        <div className="flex items-center gap-1.5 border-t border-border px-2 pt-1.5 text-xs text-muted-foreground">
          <Palmtree className="size-3.5" /> {t("players.vacationPot")}
          <span className="ml-auto tabular-nums text-warning">${game.vacationPot}</span>
        </div>
      )}
    </div>
  );
}
