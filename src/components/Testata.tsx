import type { PublicState } from "@tangentopoly/game";
import { Stanza } from "@/components/Stanza";

// Marchio e stanza. Montata due volte con visibilità responsive: dentro la colonna che
// scorre sotto md, come fascia sopra le due colonne da md in su — dove il nome del gioco
// durante la partita non compariva da nessuna parte, e il codice nemmeno.
export function Testata({ game, className }: { game: PublicState; className?: string }) {
  return (
    <header className={`flex w-full items-center justify-between gap-2 border-b border-border py-2 ${className ?? ""}`}>
      <span className="font-condensed text-sm font-bold tracking-tight uppercase">
        Tangento<span className="text-warning">poly</span>
      </span>
      <Stanza game={game} />
    </header>
  );
}
