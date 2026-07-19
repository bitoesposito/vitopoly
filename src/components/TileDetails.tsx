import { Fragment } from "react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState, TileDef } from "@tangentopoly/game";
import { useT, useTileName } from "@/lib/i18n";

type T = ReturnType<typeof useT>;

// short "what is it" line for the popover body
function tileDesc(t: T, tile: TileDef, game: PublicState): string | null {
  switch (tile.kind) {
    case "go":
      return t("info.go", { amount: 200 });
    case "jail":
      return t("info.jail");
    case "parking":
      return game.settings.vacationCash ? t("info.parkingPot", { pot: game.vacationPot }) : t("info.parking");
    case "gotojail":
      return t("info.gotojail");
    case "chance":
      return t("info.chance");
    case "chest":
      return t("info.chest");
    case "tax":
      return t("info.tax", { amount: tile.taxAmount ?? 0 });
    case "railroad":
      return t("info.railroad");
    case "utility":
      return t("info.utility");
    default:
      return null;
  }
}

// popover content, solo informativo: titolo, tabella affitti o descrizione.
// La gestione (case/ipoteche/vendita) vive in un posto solo: AssetsPanel.
export function TileDetails({ index, game }: { index: number; game: PublicState }) {
  const tile = BOARD[index];
  const t = useT();
  const name = useTileName()(index);

  return (
    <div className="space-y-3 text-sm">
      <div className="font-semibold">{name}</div>

      {tile.kind === "street" && tile.rent ? (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("info.when")}</div>
            <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">{t("info.get")}</div>
            {tile.rent.map((r, i) => (
              <Fragment key={i}>
                <span>{t(`info.rent${i}`)}</span>
                <span className="text-right tabular-nums text-success">${r}</span>
              </Fragment>
            ))}
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
            <span>{t("info.price")}: <b className="text-foreground">${tile.price}</b></span>
            <span>{t("info.house")}: <b className="text-foreground">${tile.houseCost}</b></span>
          </div>
        </>
      ) : (
        <div className="space-y-2 text-muted-foreground">
          <p>{tileDesc(t, tile, game)}</p>
          {tile.price != null && (
            <p>
              {t("info.price")}: <b className="text-foreground">${tile.price}</b>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
