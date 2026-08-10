import { Ticket } from "lucide-react";
import type { Player, PublicState } from "@tangentopoly/game";
import { Input } from "@/components/ui/input";
import { translate as tr } from "@/lib/i18n";
import { ownedTiles } from "@/lib/selectors";
import { PropertyCell } from "../PropertyCell";
import type { BundleDraft } from "./draft";

// Un lato dell'offerta: contanti, atti a celle (l'ordine di tabellone tiene i set
// adiacenti), carte prigione. I due lati stanno affiancati, quindi il contenuto è
// impaginato in verticale su una colonna stretta.
export function BundleEditor({
  game,
  player,
  title,
  accent,
  draft,
  onChange,
}: {
  game: PublicState;
  player: Player;
  title: string;
  accent: string;
  draft: BundleDraft;
  onChange: (d: BundleDraft) => void;
}) {
  const tiles = ownedTiles(game, player.id);
  const toggle = (t: number) =>
    onChange({ ...draft, props: draft.props.includes(t) ? draft.props.filter((x) => x !== t) : [...draft.props, t] });

  return (
    <div className="min-w-0 space-y-1.5 border border-border/60 bg-muted/20 p-2">
      <div className={`text-2xs font-semibold tracking-wide uppercase ${accent}`}>{title}</div>
      <div className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground">€</span>
        <Input
          className="w-full min-w-0 flex-1 tabular-nums"
          type="number"
          min={0}
          max={player.cash}
          value={draft.cash}
          onChange={(e) => onChange({ ...draft, cash: e.target.value })}
        />
      </div>
      <div className="text-micro text-muted-foreground tabular-nums">/ €{player.cash}</div>

      {tiles.length === 0 ? (
        <div className="text-xs text-muted-foreground">{tr("trade.noProps")}</div>
      ) : (
        <div className="flex flex-col gap-1">
          {tiles.map((t) => (
            <PropertyCell key={t} game={game} tile={t} sel={draft.props.includes(t)} onClick={() => toggle(t)} />
          ))}
        </div>
      )}

      {player.jailCards > 0 && (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: player.jailCards }, (_, i) => {
            const on = i < draft.jailCards;
            return (
              <button
                key={i}
                type="button"
                aria-label={tr("trade.jailCard", { n: i + 1 })}
                aria-pressed={on}
                onClick={() => onChange({ ...draft, jailCards: draft.jailCards === i + 1 ? i : i + 1 })}
                className={`border p-1 transition-colors ${on ? "border-success bg-success/25 ring-2 ring-success" : "border-border bg-muted/40 hover:bg-muted"}`}
              >
                <Ticket className="size-3.5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
