import { useState } from "react";
import type { PublicState } from "@tangentopoly/game";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TokenStamp } from "@/components/TokenStamp";
import { translate as tr } from "@/lib/i18n";
import { useGame } from "@/lib/store";
import { send } from "@/lib/net/client";
import { BundleEditor } from "./BundleEditor";
import { emptyDraft, isEmpty, toBundle, type BundleDraft } from "./draft";

// "Nuovo scambio": scelta del partner, poi i due lati affiancati. Le due colonne
// esistono per essere lette a confronto — è l'unico modo di valutare un'offerta.
export function TradeComposer({ game, myId }: { game: PublicState; myId: string }) {
  const others = game.players.filter((p) => p.id !== myId && !p.bankrupt);
  // in due non c'è niente da scegliere: il partner è già quello
  const [to, setTo] = useState(others.length === 1 ? others[0].id : "");
  const [give, setGive] = useState<BundleDraft>(emptyDraft);
  const [get, setGet] = useState<BundleDraft>(emptyDraft);

  const me = game.players.find((p) => p.id === myId)!; // il composer si apre solo da giocatori vivi
  const other = game.players.find((p) => p.id === to);
  const pick = (id: string) => {
    setTo(id);
    setGet(emptyDraft()); // gli asset selezionati appartenevano al partner precedente
  };

  const giveBundle = toBundle(give);
  const getBundle = toBundle(get);

  return (
    <div className="space-y-3 text-sm">
      {/* con un solo avversario il chip è già scelto: resta come conferma di CON CHI scambi */}
      <div className="flex flex-wrap gap-1">
        {others.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            aria-pressed={to === p.id}
            // la scala dei bottoni vale anche per un chip: scegliere con chi scambi è
            // un'azione, e a 24px di alto non lo era
            className={cn(
              buttonVariants({ variant: "outline" }),
              "gap-1.5",
              to === p.id && "border-success bg-success/25 font-semibold ring-2 ring-success"
            )}
          >
            <TokenStamp token={p.token} />
            {p.name}
          </button>
        ))}
      </div>

      {/* il filetto fra le due colonne è l'unica separazione: stesso bordo dei pannelli */}
      {/* niente items-start: le colonne si pareggiano e il filetto le divide per intero */}
      <div className="grid grid-cols-2">
        <BundleEditor
          game={game}
          player={me}
          title={tr("trade.youGive")}
          accent="text-destructive"
          draft={give}
          onChange={setGive}
          className="pr-2"
        />
        {other ? (
          <BundleEditor
            game={game}
            player={other}
            title={tr("trade.youGet")}
            accent="text-success"
            draft={get}
            onChange={setGet}
            className="border-l border-border pl-2"
          />
        ) : (
          <div className="border-l border-border pl-2 text-xs text-muted-foreground">{tr("trade.pickPlayer")}</div>
        )}
      </div>

      <Button
        className="w-full"
        disabled={!to || (isEmpty(giveBundle) && isEmpty(getBundle))}
        onClick={() => {
          send({ type: "proposeTrade", to, give: giveBundle, get: getBundle });
          useGame.setState({ tradeOpen: false });
        }}
      >
        {tr("trade.send")}
      </Button>
    </div>
  );
}
