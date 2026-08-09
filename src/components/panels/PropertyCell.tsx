import { Check, Hotel, House } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { translate as t, tileName as tn } from "@/lib/i18n";
import { GROUP_COLOR, GROUP_LABEL } from "@/lib/palette";
import { euro } from "@/lib/format";

// Talloncino d'atto: serie (filetto + regione), nome, stato — prezzo, case, ipoteca.
// Selezionabile: lo usano sia il pannello Proprietà sia i due lati di uno scambio.
export function PropertyCell({ game, tile, sel, onClick }: { game: PublicState; tile: number; sel: boolean; onClick: () => void }) {
  const o = game.props[tile];
  const def = BOARD[tile];
  const g = def.group ?? "";
  return (
    <button
      type="button"
      title={tn(tile)}
      onClick={onClick}
      aria-pressed={sel}
      // selezionato = spunta + cornice piena: il filetto verde da solo era invisibile,
      // e senza si compone uno scambio alla cieca
      className={`nota relative border p-1.5 text-left text-2xs leading-tight transition-colors ${sel ? "border-verde-carta ring-2 ring-verde-carta" : "border-paper-line/60 hover:border-paper-line"}`}
    >
      {sel && (
        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-verde-carta text-paper">
          <Check className="size-3" strokeWidth={4} />
        </span>
      )}
      <span className="mb-1 block h-px w-full" style={{ background: GROUP_COLOR[g] ?? "var(--color-muted-foreground)" }} />
      {GROUP_LABEL[g] && <div className="truncate text-micro tracking-widest text-paper-ink/70 uppercase">{GROUP_LABEL[g]}</div>}
      <div className="truncate font-medium">{tn(tile)}</div>
      <div className="flex h-3.5 items-center gap-0.5 text-paper-ink/70">
        {o?.mortgaged ? (
          <span className="font-condensed text-micro tracking-widest text-sanguigna-carta uppercase">{t("tile.mortgaged")}</span>
        ) : o && o.houses === 5 ? (
          <Hotel className="size-3 text-paper-ink" />
        ) : o && o.houses > 0 ? (
          <>
            <House className="size-3 text-paper-ink" />
            <span>×{o.houses}</span>
          </>
        ) : (
          <span className="font-mono tabular-nums">{euro(def.price ?? 0)}</span>
        )}
      </div>
    </button>
  );
}
