import { Dices, Ticket, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { translate as t, tileName as tn } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { euro } from "@/lib/format";
import type { TurnView } from "./turn";

// I bottoni dell'azione. Montati in UN SOLO posto per volta: sotto i dadi da md in su,
// dentro la barra pollice sotto md (Center li porta lì con un portal, non li duplica).
// Sotto md sono alti 3.25rem e si dividono la riga: la barra ha altezza fissa.
// La barra è flex-row-reverse (index.html): il primo bottone del DOM è l'azione primaria e
// finisce a destra, sotto il pollice. whitespace-normal perché con tre azioni ogni etichetta
// ha 102px, e "Paga cauzione €50" ne vuole due righe.
const AZIONE = "text-sm md:text-base lg:text-lg max-md:h-13 max-md:min-w-0 max-md:flex-1 max-md:whitespace-normal max-md:leading-tight";

type Primary = { label: string; icon: LucideIcon | null; run: () => void };

/** Un'azione primaria alla volta: è la regola che tiene leggibile la zona pollice. */
function primaryAction(view: TurnView): Primary | null {
  const { node, legal, isMyTurn, again } = view;
  if (!isMyTurn || node.t === "auction" || node.t === "debt" || node.t === "buyPrompt") return null;
  const roll = () => send({ type: "roll" });
  if (legal.has("roll") && node.t === "preRoll") return { label: t("center.roll"), icon: Dices, run: roll };
  if (again) return { label: t("center.rollAgain"), icon: Dices, run: roll };
  if (legal.has("endTurn") && node.t === "postRoll")
    return { label: t("center.endTurn"), icon: null, run: () => send({ type: "endTurn" }) };
  return null;
}

export function TurnActions({ view }: { view: TurnView }) {
  const { node, isMyTurn, me, buyTile, shortfall, debt, iOwe } = view;
  const primary = primaryAction(view);

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
            {t("buy.declineAuction")}
          </Button>
        </>
      )}

      {debt && iOwe && (
        <>
          <Button size="lg" className={AZIONE} disabled={(me?.cash ?? 0) < debt.claims[0].amount} onClick={() => send({ type: "payDebt" })}>
            {t("debt.pay")}
          </Button>
          <ConfirmButton
            size="lg"
            className={AZIONE}
            variant="destructive"
            label={t("debt.bankrupt")}
            armedLabel={t("debt.bankruptSure")}
            onConfirm={() => send({ type: "bankrupt" })}
          />
        </>
      )}
    </>
  );
}
