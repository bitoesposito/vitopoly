import { Ticket } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { Bundle } from "@tangentopoly/game";
import { useT, useTileName } from "@/lib/i18n";
import { GROUP_COLOR } from "@/lib/palette";
import { euro } from "@/lib/format";

/** Un lato di uno scambio come chip: contanti, atti (pallino del gruppo), carte prigione.
 *  `fly` = variante animata per la carta evento: i chip volano nella direzione dello scambio.
 *  `paper` = inchiostri stampabili, per quando i chip stanno su carta chiara. */
export function BundleChips({ b, fly, paper }: { b: Bundle; fly?: "r" | "l"; paper?: boolean }) {
  const tr = useT();
  const tn = useTileName();
  const chips: React.ReactNode[] = [];

  if (b.cash > 0) chips.push(<span key="€" className={`font-mono font-semibold ${paper ? "text-verde-carta" : "text-success"}`}>{euro(b.cash)}</span>);
  for (const t of b.props)
    chips.push(
      <span key={t} className="flex items-center gap-1">
        <span className="size-2 shrink-0 rounded-full" style={{ background: GROUP_COLOR[BOARD[t].group ?? ""] ?? "var(--color-muted-foreground)" }} />
        {tn(t)}
      </span>,
    );
  if (b.jailCards > 0)
    chips.push(
      <span key="j" className="flex items-center gap-1">
        <Ticket className="size-3" />×{b.jailCards}
      </span>,
    );

  if (chips.length === 0) return <span className={`text-xs ${paper ? "text-paper-ink/60" : "text-muted-foreground"}`}>{tr("bundle.nothing")}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`flex items-center border px-1.5 py-0.5 text-xs ${paper ? "border-paper-line/60 text-paper-ink" : "border-border bg-muted"} ${fly ? `chip-fly-${fly}` : ""}`}
          style={fly ? { animationDelay: `${250 + i * 130}ms` } : undefined}
        >
          {c}
        </span>
      ))}
    </span>
  );
}
