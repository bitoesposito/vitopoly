import { DoorOpen, Share2 } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { translate as t } from "@/lib/i18n";
import { send, torna } from "@/lib/net/client";
import { shareInvite } from "@/lib/share";
import { useGame } from "@/lib/store";

// Dove sei e come te ne vai. Installata, l'app non ha barra degli indirizzi né tasto
// indietro: il codice della stanza non era scritto da nessuna parte e non esisteva una via
// d'uscita che non fosse chiudere l'app.
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
        <Button size="sm" variant="ghost" className={`font-mono text-micro tracking-widest uppercase ${className ?? ""}`}>
          N. {code}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 font-sans">
        <Button variant="outline" className="w-full" onClick={() => shareInvite(code)}>
          <Share2 />
          {t("settings.inviteDesc")}
        </Button>
        {mio && <p className="text-2xs text-muted-foreground">{game.status === "lobby" ? t("room.leaveLobby") : t("room.leaveGame")}</p>}
        <ConfirmButton
          variant="destructive"
          className="w-full"
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
      </PopoverContent>
    </Popover>
  );
}
