import { DoorOpen, Menu, Share2 } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { translate as t } from "@/lib/i18n";
import { send, torna } from "@/lib/net/client";
import { shareInvite } from "@/lib/share";
import { useGame } from "@/lib/store";

// Dove sei e come te ne vai: installata, l'app non ha barra degli indirizzi né tasto
// indietro, quindi il codice e l'uscita devono stare nell'interfaccia.
export function Stanza({ game, className }: { game: PublicState; className?: string }) {
  const code = useGame((s) => s.code);
  const myId = useGame((s) => s.myId);
  if (!code) return null;

  const mio = game.players.find((p) => p.id === myId && !p.bankrupt); // gli spettatori non hanno posto da lasciare
  const esci = () => {
    if (mio) send({ type: "leave" });
    // il frame parte prima che la navigazione chiuda la socket
    setTimeout(torna, 300);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={t("room.menu")} className={className}>
          <Menu />
        </Button>
      </PopoverTrigger>
      {/* Un menu, non un modulo: dove sei, una voce, un filetto e l'uscita. Lo spazio fra
          le righe è il gap del popover. */}
      <PopoverContent align="end" className="w-56 gap-1 font-sans">
        {/* Il codice non sta più sul bottone, quindi è la prima cosa che il menu dice:
            senza barra degli indirizzi è l'unico posto in cui si legge. */}
        <div className="flex items-baseline justify-between px-2.5 pb-1">
          <span className="text-micro tracking-widest text-muted-foreground uppercase">{t("room.label")}</span>
          <span className="font-mono text-sm font-bold tracking-widest uppercase select-all">{code}</span>
        </div>
        <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => shareInvite(code)}>
          <Share2 />
          {t("room.share")}
        </Button>
        <div className="-mx-2.5 border-t border-border" />
        <ConfirmButton
          size="sm"
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10"
          label={
            <>
              <DoorOpen />
              {t("room.leave")}
            </>
          }
          armedLabel={t("room.leaveSure")}
          armedAriaLabel={t("room.leaveSure")}
          onConfirm={esci}
        />
        {mio && (
          <p className="px-2.5 text-2xs text-muted-foreground">{game.status === "lobby" ? t("room.leaveLobby") : t("room.leaveGame")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
