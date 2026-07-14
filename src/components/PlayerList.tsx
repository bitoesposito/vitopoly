import { Crown, Lock, Palmtree, Ticket, WifiOff } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { TOKEN_COLOR } from "@/lib/colors";

// ponytail: black ring = outline di contrasto sui colori pedina, non un token themabile
const dot = (token: number) => (
  <span className="size-3 shrink-0 rounded-full ring-1 ring-black/40" style={{ background: TOKEN_COLOR[token % 8] }} />
);

const isTurn = (game: PublicState, pid: string) => game.status === "playing" && game.players[game.current]?.id === pid;

export function PlayerList({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const t = useT();
  return (
    <div className="space-y-1">
      {game.players.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-2 text-xs ${isTurn(game, p.id) ? "bg-accent text-accent-foreground ring-1 ring-ring" : ""} ${p.bankrupt ? "opacity-40" : ""}`}
        >
          {dot(p.token)}
          <span className="truncate font-medium">
            {p.name}
            {p.id === myId && <span className="text-muted-foreground"> {t("players.you")}</span>}
          </span>
          {i === 0 && <Crown className="size-3.5 text-warning" aria-label={t("aria.host")} />}
          {p.inJail && <Lock className="size-3.5 text-muted-foreground" aria-label={t("aria.jail")} />}
          {p.jailCards > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Ticket className="size-3.5" />×{p.jailCards}
            </span>
          )}
          {!p.connected && <WifiOff className="size-3.5 text-muted-foreground" aria-label={t("aria.disconnected")} />}
          {game.status !== "lobby" && <span className="ml-auto tabular-nums text-success">${p.cash}</span>}
        </div>
      ))}
      {game.status === "playing" && game.settings.vacationCash && (
        <div className="flex items-center gap-1.5 px-2 pt-1 text-xs text-muted-foreground">
          <Palmtree className="size-3.5" /> {t("players.vacationPot")}{" "}
          <span className="ml-auto tabular-nums text-warning">${game.vacationPot}</span>
        </div>
      )}
    </div>
  );
}
