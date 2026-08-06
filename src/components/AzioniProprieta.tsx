import { House, Minus, Plus } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { euro } from "@/lib/utils";

// Le azioni su una proprietà tua. Vive in un file suo perché la usano due superfici
// che non devono conoscersi: il pannello Proprietà e il popover della casella.
// Le condizioni sono quelle del motore: costruire richiede il tuo turno fuori da un
// interrupt, fare cassa vale anche mentre stai risolvendo un debito.
export function AzioniProprieta({ game, myId, tile }: { game: PublicState; myId: string; tile: number }) {
  const t = useT();
  const own = game.props[tile];
  const def = BOARD[tile];
  if (!own || own.owner !== myId) return null;

  const node = game.stack.at(-1) ?? game.phase;
  const myTurn = game.players[game.current]?.id === myId;
  const inMyDebt = game.stack.some((f) => f.t === "debt" && f.debtor === myId);
  const canRaise = game.status === "playing" && (myTurn || inMyDebt);
  const canBuild = (node.t === "preRoll" || node.t === "postRoll") && myTurn;
  if (!canRaise && !canBuild) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {canBuild && def.kind === "street" && !own.mortgaged && own.houses < 5 && (
        <Button size="sm" variant="secondary" className="flex-1 pointer-coarse:min-h-11" onClick={() => send({ type: "build", tile })}>
          <Plus className="size-3.5" />
          <House className="size-3.5" />
          {euro(def.houseCost ?? 0)}
        </Button>
      )}
      {canRaise && own.houses > 0 && (
        <Button size="sm" variant="secondary" className="flex-1 pointer-coarse:min-h-11" onClick={() => send({ type: "sellHouse", tile })}>
          <Minus className="size-3.5" />
          <House className="size-3.5" />+{euro(def.houseCost! / 2)}
        </Button>
      )}
      {canRaise && game.settings.mortgageAllowed && own.houses === 0 && !own.mortgaged && (
        <Button size="sm" variant="secondary" className="flex-1 pointer-coarse:min-h-11" onClick={() => send({ type: "mortgage", tile })}>
          {t("assets.mortgage", { amount: euro(def.price! / 2) })}
        </Button>
      )}
      {canBuild && own.mortgaged && (
        <Button size="sm" variant="secondary" className="flex-1 pointer-coarse:min-h-11" onClick={() => send({ type: "unmortgage", tile })}>
          {t("assets.unmortgage", { amount: euro(Math.ceil((def.price! / 2) * 1.1)) })}
        </Button>
      )}
      {canRaise && own.houses === 0 && !own.mortgaged && (
        <Button size="sm" variant="secondary" className="flex-1 pointer-coarse:min-h-11" onClick={() => send({ type: "sellProperty", tile })}>
          {t("assets.sell", { amount: euro(def.price! / 2) })}
        </Button>
      )}
    </div>
  );
}
