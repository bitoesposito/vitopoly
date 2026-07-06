import { Fragment } from "react";
import { BOARD } from "@vitopoly/game";
import type { DebtFrame, PublicState, TileDef } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/store";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";

type T = ReturnType<typeof useT>;

// Spiegazione breve "cos'è e che fa" — usata dal tooltip della tile.
export function tileDesc(t: T, tile: TileDef, game: PublicState): string | null {
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

// Contenuto del popover: titolo, tabella costi (vie) o info, azioni build/mortgage se è mia.
export function TileDetails({ index, game }: { index: number; game: PublicState }) {
  const tile = BOARD[index];
  const myId = useGame((s) => s.myId);
  const t = useT();
  const name = useTileName()(index);
  const own = game.props[index];

  // stesse condizioni di AssetsPanel: gestisco nel mio postRoll o nel mio debito
  const node = game.stack.at(-1) ?? game.phase;
  const myTurn = game.players[game.current]?.id === myId;
  const inMyDebt = node.t === "debt" && (node as DebtFrame).debtor === myId;
  const canBuild = node.t === "postRoll" && myTurn;
  const canManage = canBuild || inMyDebt;
  const mine = own?.owner === myId;

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

      {mine && canManage && (
        <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
          {canBuild && tile.kind === "street" && !own!.mortgaged && (
            <Button size="xs" variant="secondary" onClick={() => send({ type: "build", tile: index })}>
              +🏠${tile.houseCost}
            </Button>
          )}
          {own!.houses > 0 && (
            <Button size="xs" variant="secondary" onClick={() => send({ type: "sellHouse", tile: index })}>
              −🏠
            </Button>
          )}
          {game.settings.mortgageAllowed && own!.houses === 0 && !own!.mortgaged && (
            <Button size="xs" variant="secondary" onClick={() => send({ type: "mortgage", tile: index })}>
              {t("assets.mortgage", { amount: tile.price! / 2 })}
            </Button>
          )}
          {canBuild && own!.mortgaged && (
            <Button size="xs" variant="secondary" onClick={() => send({ type: "unmortgage", tile: index })}>
              {t("assets.unmortgage", { amount: Math.ceil((tile.price! / 2) * 1.1) })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
