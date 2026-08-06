import { Fragment } from "react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState, TileDef } from "@tangentopoly/game";
import { useT, useTileName } from "@/lib/i18n";
import { GROUP_COLOR, GROUP_LABEL, TOKEN_COLOR } from "@/lib/colors";
import { euro } from "@/lib/utils";

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
  const own = game.props[index];
  const proprietario = own ? game.players.find((p) => p.id === own.owner) : undefined;

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="font-semibold">{name}</div>
        {/* la serie del titolo, scritta: sul tabellone è una banda d'inchiostro e basta */}
        {tile.group && GROUP_LABEL[tile.group] && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-3 w-1 shrink-0" style={{ background: GROUP_COLOR[tile.group] }} />
            <span className="text-micro tracking-widest text-muted-foreground uppercase">{GROUP_LABEL[tile.group]}</span>
          </div>
        )}
        {/* sulla plancia il possesso è solo colore: qui il nome, per chi il colore
            non lo distingue e per chi semplicemente non lo ricorda */}
        {proprietario && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span className="size-3 shrink-0" style={{ background: TOKEN_COLOR[proprietario.token % 8] }} />
            <span className="text-muted-foreground">{t("info.owner")}</span>
            <b className="min-w-0 truncate">{proprietario.name}</b>
            {own?.mortgaged && <span className="text-destructive">· {t("tile.mortgaged")}</span>}
          </div>
        )}
      </div>

      {tile.kind === "street" && tile.rent ? (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("info.when")}</div>
            <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">{t("info.get")}</div>
            {tile.rent.map((r, i) => (
              <Fragment key={i}>
                <span>{t(`info.rent${i}`)}</span>
                <span className="text-right font-mono tabular-nums text-success">{euro(r)}</span>
              </Fragment>
            ))}
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
            <span>{t("info.price")}: <b className="font-mono text-foreground">{euro(tile.price ?? 0)}</b></span>
            <span>{t("info.house")}: <b className="font-mono text-foreground">{euro(tile.houseCost ?? 0)}</b></span>
          </div>
        </>
      ) : (
        <div className="space-y-2 text-muted-foreground">
          <p>{tileDesc(t, tile, game)}</p>
          {tile.price != null && (
            <p>
              {t("info.price")}: <b className="font-mono text-foreground">{euro(tile.price)}</b>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
