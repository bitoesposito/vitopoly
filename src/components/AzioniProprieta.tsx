import { House, Minus, Plus } from "lucide-react";
import {
  BOARD,
  costoRiscatto,
  legalActions,
  percheNoBuild,
  percheNoMortgage,
  percheNoSellHouse,
  percheNoSellProperty,
  percheNoUnmortgage,
} from "@tangentopoly/game";
import type { ClientAction, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { euro } from "@/lib/utils";

// Le azioni su una proprietà tua, in un file suo perché le usano due superfici che
// non devono conoscersi: il pannello Proprietà e il popover della casella.
//
// Nessuna regola è riscritta qui. Il MOTIVO per cui un'azione non si può fare arriva
// dai predicati del motore (percheNo*), il MOMENTO in cui si può fare da legalActions.
// Prima la UI riscriveva le condizioni a mano e mostrava "costruisci" anche senza il
// set completo: si premeva, e il server rifiutava.
export function AzioniProprieta({ game, myId, tile }: { game: PublicState; myId: string; tile: number }) {
  const t = useT();
  const own = game.props[tile];
  const def = BOARD[tile];
  if (!own || own.owner !== myId) return null;

  const legal = new Set(legalActions(game, myId));
  const strada = def.kind === "street";

  // mostrata = l'azione ha senso su questa casella; spenta = adesso non si può, e il
  // title dice perché. Spegnere spiegando è meglio che nascondere senza motivo.
  const azioni: { tipo: ClientAction["type"]; mostra: boolean; perche: string | null; nodo: React.ReactNode }[] = [
    {
      tipo: "build",
      mostra: strada && !own.mortgaged && own.houses < 5,
      perche: percheNoBuild(game, myId, tile),
      nodo: (
        <>
          <Plus className="size-3.5" />
          <House className="size-3.5" />
          {euro(def.houseCost ?? 0)}
        </>
      ),
    },
    {
      tipo: "sellHouse",
      mostra: strada && own.houses > 0,
      perche: percheNoSellHouse(game, myId, tile),
      nodo: (
        <>
          <Minus className="size-3.5" />
          <House className="size-3.5" />+{euro((def.houseCost ?? 0) / 2)}
        </>
      ),
    },
    {
      tipo: "mortgage",
      mostra: game.settings.mortgageAllowed && !own.mortgaged,
      perche: percheNoMortgage(game, myId, tile),
      nodo: t("assets.mortgage", { amount: euro((def.price ?? 0) / 2) }),
    },
    {
      tipo: "unmortgage",
      mostra: own.mortgaged,
      perche: percheNoUnmortgage(game, myId, tile),
      nodo: t("assets.unmortgage", { amount: euro(costoRiscatto(tile)) }),
    },
    {
      tipo: "sellProperty",
      mostra: !own.mortgaged,
      perche: percheNoSellProperty(game, myId, tile),
      nodo: t("assets.sell", { amount: euro((def.price ?? 0) / 2) }),
    },
  ];

  const visibili = azioni.filter((a) => a.mostra);
  if (visibili.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {visibili.map(({ tipo, perche, nodo }) => {
        const fuoriTempo = !legal.has(tipo);
        const motivo = fuoriTempo ? t("assets.notNow") : perche;
        return (
          <Button
            key={tipo}
            size="sm"
            variant="secondary"
            className="flex-1 pointer-coarse:min-h-11"
            disabled={!!motivo}
            title={motivo ?? undefined}
            onClick={() => send({ type: tipo } as ClientAction)}
          >
            {nodo}
          </Button>
        );
      })}
    </div>
  );
}
