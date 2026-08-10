import { useState } from "react";
import { House } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { ConfirmButton } from "@/components/ConfirmButton";
import { translate as t } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { auctionLive, ownedTiles } from "@/lib/selectors";
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
  const me = game.players.find((p) => p.id === myId);
  // il ritiro volontario è legale sempre — il motore lo blocca solo in asta
  const canQuit = game.status === "playing" && !!me && !me.bankrupt && !auctionLive(game);

  return (
    <Panel>
      {/* La bancarotta sta in coda all'intestazione: è ciò che si fa col patrimonio quando
          non basta più, e un pannello a sé costava una riga di altezza. Piccola e a due
          tocchi: non è un bersaglio da prendere per sbaglio. */}
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <House className="size-3.5" />
        {t("assets.title", { n: mine.length })}
        {canQuit && (
          <ConfirmButton
            size="sm"
            variant="destructive"
            className="ml-auto shrink-0 pointer-coarse:min-h-11"
            title={t("debt.bankruptHint")}
            label={t("debt.bankrupt")}
            armedLabel={t("debt.bankruptSure")}
            onConfirm={() => send({ type: "bankrupt" })}
          />
        )}
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
        <div key={selTile} className="animate-in duration-200 fade-in">
          <PropertyActions game={game} myId={myId} tile={selTile} />
        </div>
      )}
    </Panel>
  );
}
