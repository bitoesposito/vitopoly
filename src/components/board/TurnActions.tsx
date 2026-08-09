import { Dices, Ticket, type LucideIcon } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { euro } from "@/lib/format";
import type { TurnView } from "./turn";

// I bottoni dell'azione. Montati in UN SOLO posto per volta: sotto i dadi da md in su,
// dentro la barra pollice sotto md (Center li porta lì con un portal, non li duplica).
// Sotto md sono alti 3.25rem e si dividono la riga: la barra ha altezza fissa.
const AZIONE = "text-sm md:text-base lg:text-lg max-md:h-13 max-md:min-w-0 max-md:flex-1";

type Primary = { label: string; icon: LucideIcon | null; run: () => void };

/** Un'azione primaria alla volta: è la regola che tiene leggibile la zona pollice. */
function primaryAction(view: TurnView, t: ReturnType<typeof useT>): Primary | null {
  const { node, legal, isMyTurn, again } = view;
  if (!isMyTurn || node.t === "auction" || node.t === "debt" || node.t === "buyPrompt") return null;
  const roll = () => send({ type: "roll" });
  if (legal.has("roll") && node.t === "preRoll") return { label: t("center.roll"), icon: Dices, run: roll };
  if (again) return { label: t("center.rollAgain"), icon: Dices, run: roll };
  if (legal.has("endTurn") && node.t === "postRoll") return { label: t("center.endTurn"), icon: null, run: () => send({ type: "endTurn" }) };
  return null;
}

export function TurnActions({ game, view }: { game: PublicState; view: TurnView }) {
  const t = useT();
  const tn = useTileName();
  const { node, isMyTurn, me, buyTile, shortfall, debt, iOwe } = view;
  const primary = primaryAction(view, t);

  return (
    <>
      {primary && (
        <Button size="lg" className={AZIONE} onClick={primary.run}>
          {primary.icon && <primary.icon className="size-4" />}
          {primary.label}
        </Button>
      )}

      {me?.inJail && isMyTurn && node.t === "preRoll" && (
        <>
          <Button size="lg" className={AZIONE} variant="secondary" onClick={() => send({ type: "payBail" })}>
            {t("center.payBail")}
          </Button>
          {me.jailCards > 0 && (
            <Button size="lg" className={AZIONE} variant="secondary" onClick={() => send({ type: "useJailCard" })}>
              <Ticket className="size-4" />
              {t("center.useJailCard")}
            </Button>
          )}
        </>
      )}

      {buyTile !== null && (
        <>
          <Button
            size="lg"
            className={AZIONE}
            disabled={shortfall > 0}
            title={shortfall > 0 ? t("buy.short", { amount: euro(shortfall) }) : tn(buyTile)}
            onClick={() => send({ type: "buy" })}
          >
            {t("buy.buy")}
          </Button>
          <Button size="lg" className={AZIONE} variant="secondary" onClick={() => send({ type: "decline" })}>
            {game.settings.auction ? t("buy.declineAuction") : t("buy.decline")}
          </Button>
        </>
      )}

      {debt && iOwe && <DebtActions payable={(me?.cash ?? 0) >= debt.claims[0].amount} />}
    </>
  );
}

function DebtActions({ payable }: { payable: boolean }) {
  const t = useT();
  return (
    <>
      {/* stesso richiamo della pedina di turno, in giallo: il debito è l'unica azione
          che blocca la partita finché non la fai */}
      <span className="relative flex max-md:min-w-0 max-md:flex-1">
        {payable && <span className="absolute -inset-1 animate-ping bg-warning opacity-35" aria-hidden />}
        <Button size="lg" className={`${AZIONE} relative`} disabled={!payable} onClick={() => send({ type: "payDebt" })}>
          {t("debt.pay")}
        </Button>
      </span>
      <ConfirmButton
        size="lg"
        className={AZIONE}
        variant="destructive"
        label={t("debt.bankrupt")}
        armedLabel={t("debt.bankruptSure")}
        onConfirm={() => send({ type: "bankrupt" })}
      />
    </>
  );
}
