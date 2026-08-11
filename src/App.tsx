import { useGame } from "@/lib/store";
import { translate as t } from "@/lib/i18n";
import { Lobby } from "@/components/lobby/Lobby";
import { PreMatch } from "@/components/lobby/PreMatch";
import { Board } from "@/components/board/Board";
import { GamePanels } from "@/components/panels/GamePanels";
import { Sidebar } from "@/components/Sidebar";
import { Stanza } from "@/components/Stanza";

export default function App() {
  const game = useGame((s) => s.game);
  const connected = useGame((s) => s.connected);
  const retries = useGame((s) => s.retries);
  const myId = useGame((s) => s.myId);

  // ws.ts reconnects on its own; just show a banner while offline
  if (!game) return <Lobby />;

  const spectator = !game.players.some((p) => p.id === myId); // joined after the game started
  const me = game.players.find((p) => p.id === myId);
  // i banner sono fixed: il padding evita che coprano la cima della plancia
  const banner = !connected || spectator || me?.bankrupt;

  return (
    <div className={`flex h-dvh flex-col bg-background text-foreground md:flex-row ${banner ? "pt-6" : ""}`}>
      {/* senza questo ogni turno costa 40 Tab */}
      <a
        href="#azione"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:bg-warning focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-background"
      >
        {t("a11y.skipToAction")}
      </a>
      {!connected && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning py-1 text-center text-xs font-semibold text-black">
          {retries >= 5 ? (
            <>
              {t("net.stuck")}
              <button type="button" className="underline underline-offset-2" onClick={() => location.reload()}>
                {t("net.reload")}
              </button>
            </>
          ) : (
            t("net.reconnecting")
          )}
        </div>
      )}
      {connected && me?.bankrupt && (
        <div className="fixed inset-x-0 top-0 z-40 bg-destructive py-1 text-center text-xs font-semibold text-background">
          {t("net.bankrupt")}
        </div>
      )}
      {connected && spectator && (
        <div className="fixed inset-x-0 top-0 z-40 bg-muted py-1 text-center text-xs font-semibold text-muted-foreground">
          {t("spec.banner")}
        </div>
      )}
      {/* panels render twice with responsive visibility: mobile below the board, desktop in the Sidebar */}
      <main className="max-h-[100vh] min-h-0 flex-1 overflow-auto">
        {/* md:p-2 = stesso gutter dal bordo pagina delle sidebar; center-safe: se il
            contenuto supera l'altezza non taglia la parte alta, la lascia scrollabile */}
        <div className="flex flex-col items-center justify-center-safe gap-3 sm:h-full md:p-2">
          {game.status === "lobby" ? (
            <PreMatch game={game} />
          ) : (
            <>
              {/* solo mobile: la plancia partiva incollata al bordo alto. Il marchio
                  dà l'aria che mancava ed è anche l'unico posto dove il nome del
                  gioco compare durante la partita. */}
              <header className="flex w-full items-baseline justify-between px-3 pt-2 md:hidden">
                <span className="font-condensed text-sm font-bold tracking-tight uppercase">
                  Tangento<span className="text-warning">poly</span>
                </span>
                {/* dove "SERIE 1992" era decorazione, ora c'è il codice della stanza e la via
                    d'uscita: in standalone non esistono barra degli indirizzi né tasto indietro */}
                <Stanza game={game} />
              </header>
              <Board game={game} />
              {/* la barra pollice è fixed: le si lascia sotto la sua altezza piena */}
              <div className="w-full pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] md:hidden">
                <GamePanels game={game} />
              </div>
            </>
          )}
        </div>
      </main>
      <Sidebar game={game} />
    </div>
  );
}
