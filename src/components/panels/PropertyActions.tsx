import { House, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  BOARD,
  legalActions,
  sellValue,
  unmortgageCost,
  whyNotBuild,
  whyNotMortgage,
  whyNotSellHouse,
  whyNotSellProperty,
  whyNotUnmortgage,
} from "@tangentopoly/game";
import type { ClientAction, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { translate as t } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { euro } from "@/lib/format";

// Le azioni su una proprietà tua: le usano il pannello Proprietà e il popover della
// casella. Nessuna regola riscritta qui — il MOTIVO per cui non si può viene dai
// predicati del motore (whyNot*), il MOMENTO da legalActions.
type PropertyAction = Extract<ClientAction, { tile: number }>;

interface Row {
  type: PropertyAction["type"];
  /** ha senso su questa casella (≠ si può fare adesso) */
  shown: boolean;
  /** perché non si può, secondo le regole del motore */
  why: string | null;
  label: React.ReactNode;
}

export function PropertyActions({ game, myId, tile }: { game: PublicState; myId: string; tile: number }) {
  const own = game.props[tile];
  const def = BOARD[tile];
  if (!own || own.owner !== myId) return null;

  const legal = new Set(legalActions(game, myId));
  const street = def.kind === "street";

  const rows: Row[] = [
    {
      type: "build",
      // mostrato anche su titolo ipotecato: whyNotBuild dice "è ipotecata", e un bottone
      // che sparisce si legge come una funzione che non esiste
      shown: street && own.houses < 5,
      why: whyNotBuild(game, myId, tile),
      label: (
        <>
          <Plus className="size-3.5" />
          <House className="size-3.5" />
          {euro(def.houseCost ?? 0)}
        </>
      ),
    },
    {
      type: "sellHouse",
      shown: street && (own.houses > 0 || own.mortgaged),
      why: whyNotSellHouse(game, myId, tile),
      label: (
        <>
          <Minus className="size-3.5" />
          <House className="size-3.5" />+{euro((def.houseCost ?? 0) / 2)}
        </>
      ),
    },
    {
      type: "mortgage",
      shown: game.settings.mortgageAllowed && !own.mortgaged,
      why: whyNotMortgage(game, myId, tile),
      label: t("assets.mortgage", { amount: euro((def.price ?? 0) / 2) }),
    },
    {
      type: "unmortgage",
      shown: own.mortgaged,
      why: whyNotUnmortgage(game, myId, tile),
      label: t("assets.unmortgage", { amount: euro(unmortgageCost(tile)) }),
    },
    {
      type: "sellProperty",
      shown: true,
      why: whyNotSellProperty(game, myId, tile),
      // ipotecata: metà prezzo è già incassata, quindi qui compare il solo plusvalore
      label: t("assets.sell", { amount: euro(sellValue(tile, own.mortgaged)) }),
    },
  ];

  const visible = rows.filter((r) => r.shown);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(({ type, why, label }) => {
        // fuori tempo = la regola va bene, ma non in questo momento del turno
        const blocked = legal.has(type) ? why : t("assets.notNow");
        return (
          <Button
            key={type}
            size="sm"
            variant="secondary"
            className={`flex-1 pointer-coarse:min-h-11 ${blocked ? "opacity-50" : ""}`}
            aria-disabled={!!blocked}
            title={blocked ?? undefined}
            // non `disabled`: su touch il tooltip non esiste, e un bottone spento e muto
            // si legge come assente. Il motivo va detto, quindi il tap lo dice.
            onClick={() => (blocked ? toast.warning(blocked) : send({ type, tile }))}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
