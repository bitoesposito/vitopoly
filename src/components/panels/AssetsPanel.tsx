import { useState } from "react";
import { House } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { translate as t } from "@/lib/i18n";
import { ownedTiles } from "@/lib/selectors";
import { Panel } from "./Panel";
import { PropertyCell } from "./PropertyCell";
import { PropertyActions } from "./PropertyActions";

// Le mie proprietà: tocchi una cella e sotto compaiono le azioni per QUELLA proprietà,
// a tutta larghezza invece che spalmate su ogni riga.
export function AssetsPanel({ game, myId }: { game: PublicState; myId: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const mine = ownedTiles(game, myId);
  // quando si può fare cosa lo decide PropertyActions: qui basta sapere cosa è scelto
  const selTile = sel !== null && mine.includes(sel) ? sel : null; // venduta/scambiata -> selezione decade

  return (
    <Panel>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <House className="size-3.5" />
        {t("assets.title", { n: mine.length })}
      </div>
      {mine.length === 0 ? (
        <div className="text-xs text-muted-foreground">{t("trade.noProps")}</div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {mine.map((tl) => (
            <PropertyCell key={tl} game={game} tile={tl} sel={selTile === tl} onClick={() => setSel(selTile === tl ? null : tl)} />
          ))}
        </div>
      )}
      {selTile !== null && (
        <div key={selTile} className="duration-200 animate-in fade-in">
          <PropertyActions game={game} myId={myId} tile={selTile} />
        </div>
      )}
    </Panel>
  );
}
