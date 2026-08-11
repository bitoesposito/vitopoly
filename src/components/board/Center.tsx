import { useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Rules } from "@/components/lobby/Rules";
import { useGame } from "@/lib/store";
import { translate as t, tileName as tn } from "@/lib/i18n";
import { send } from "@/lib/net/client";
import { euro } from "@/lib/format";
import { lastRoll } from "@/lib/selectors";
import { Cash } from "@/components/Cash";
import { Countdown } from "./Countdown";
import { DiceTray } from "./Dice";
import { EventLog } from "./EventLog";
import { GameOver } from "./GameOver";
import { TurnActions } from "./TurnActions";
import { turnView } from "./turn";

// Il quadrato centrale della plancia: di chi è il turno, i dadi, cosa ti viene chiesto,
// e il registro. I BOTTONI vivono in TurnActions e vengono montati o qui (da md) o nella
// barra pollice (sotto md) — mai in due posti insieme.
export function Center({ game }: { game: PublicState }) {
  // il contenitore vive in index.html: esiste già al primo render
  const [thumbBar] = useState(() => document.getElementById("barra-azione"));
  const myId = useGame((s) => s.myId);
  const feed = useGame((s) => s.feed);

  if (game.status === "ended") return <GameOver game={game} />;

  const view = turnView(game, myId);
  const { isMyTurn, me, current, names, canRoll, buyTile, shortfall, debt, iOwe, owed, creditors } = view;
  const dice = lastRoll(feed, game.log);
  const actions = <TurnActions game={game} view={view} />;

  // il risultato del dado esiste solo come trasformazione CSS: senza questo è muto
  const announcement = [
    dice ? t("aria.rolled", { d1: dice.d1, d2: dice.d2 }) : "",
    isMyTurn ? t("center.yourTurn") : `${t("center.turnOf")} ${current?.name ?? ""}`,
    buyTile !== null ? `${t("buy.q", { name: tn(buyTile) })} ${euro(BOARD[buyTile].price ?? 0)}` : "",
    shortfall > 0 ? t("buy.short", { amount: euro(shortfall) }) : "",
    iOwe ? t("debt.youOwe", { total: euro(owed), to: creditors }) : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    // il centro è parte del tabellone: stessa voce delle caselle
    <div className="tratteggio flex h-full flex-col gap-2 overflow-y-auto bg-card p-2 font-condensed sm:p-3">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {/* metà alta ANCORATA in alto (niente justify-center): riga turno e dadi hanno
          posizione fissa, prompt e bottoni crescono verso il basso senza spostare nulla */}
      <div className="flex flex-1 basis-0 flex-col items-center gap-2 pt-1 sm:gap-3 sm:pt-2">
        <div className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground sm:text-sm lg:text-base">
          {/* flex: il testo del turno si allinea a timer e cifra, che un inline-block
              sfalserebbe con lo scarto della baseline */}
          <span className="flex items-center">
            {/* key sul giocatore: il passaggio di turno entra invece di sostituirsi. Il
                countdown resta fuori, o si rimonterebbe muto a ogni cambio. */}
            <span key={current?.id ?? "-"} className="animate-in duration-200 fade-in slide-in-from-top-1">
              {isMyTurn ? (
                <b className="text-foreground">{t("center.yourTurn")}</b>
              ) : (
                <>
                  {t("center.turnOf")} <b className="text-foreground">{names[current?.id ?? ""]}</b>
                </>
              )}
            </span>
            <Countdown deadline={game.deadline} />
          </span>
          {/* La cifra è di CHI HA IL TURNO: sta accanto al suo nome. La key sul giocatore
              perché al cambio di turno è di un altro, e il delta non deve inventare una
              differenza che nessuno ha pagato. */}
          {current && <Cash key={current.id} value={current.cash} delta className="text-success" />}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={t("rules.title")}>
                <CircleHelp className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-[70dvh] w-80 overflow-y-auto font-sans">
              <Rules />
            </PopoverContent>
          </Popover>
        </div>

        <DiceTray roll={dice} enabled={canRoll} onRoll={() => send({ type: "roll" })} label={t("center.roll")} mine={isMyTurn} />

        {/* quando in alto c'è il contante di un altro, il mio resta visibile qui: durante
            un'asta è il numero che decide quanto posso offrire */}
        {me && !isMyTurn && (
          <div className="text-2xs text-muted-foreground sm:text-xs">
            {t("center.yourCash")} <Cash value={me.cash} delta className="text-success" />
          </div>
        )}

        {/* #azione = bersaglio dello skip link (40 celle lo precedono) */}
        <div id="azione" tabIndex={-1} className="flex flex-col items-center gap-2 focus:outline-none">
          {buyTile !== null && (
            <div className="space-y-1 text-center">
              <div className="text-sm font-semibold lg:text-base">
                {t("buy.q", { name: tn(buyTile) })} <span className="font-mono text-success">{euro(BOARD[buyTile].price ?? 0)}</span>?
              </div>
              {/* mancano i soldi: dirlo, e dire quanti */}
              {shortfall > 0 && (
                <div role="alert" className="text-xs font-semibold text-destructive lg:text-sm">
                  {t("buy.short", { amount: euro(shortfall) })}
                </div>
              )}
            </div>
          )}

          {debt &&
            (iOwe ? (
              <div className="space-y-1 text-center">
                <div className="text-sm font-semibold text-destructive lg:text-base">
                  {t("debt.youOwe", { total: euro(owed), to: creditors })}
                </div>
                <div className="text-xs text-muted-foreground lg:text-sm">{t("debt.help")}</div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground lg:text-sm">
                {t("debt.someone", { name: names[debt.debtor] ?? "", total: euro(owed) })}
              </div>
            ))}

          {/* sotto md le azioni si spostano nella barra: display:none le toglie anche dal tab */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-md:hidden">{actions}</div>
        </div>
      </div>

      <EventLog game={game} myId={myId} />

      {/* zona pollice: la barra vive in index.html e porta la sua cromatura */}
      {thumbBar && createPortal(actions, thumbBar)}
    </div>
  );
}
