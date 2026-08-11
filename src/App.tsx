import { useGame } from "@/lib/store";
import { translate as t } from "@/lib/i18n";
import { Lobby } from "@/components/lobby/Lobby";
import { PreMatch } from "@/components/lobby/PreMatch";
import { Board } from "@/components/board/Board";
import { GamePanels } from "@/components/panels/GamePanels";
import { Sidebar } from "@/components/Sidebar";
import { Testata } from "@/components/Testata";

export default function App() {
  const game = useGame((s) => s.game);
  const connected = useGame((s) => s.connected);
  const retries = useGame((s) => s.retries);
  const myId = useGame((s) => s.myId);

  if (!game) return <Lobby />;

  const spectator = !game.players.some((p) => p.id === myId); // joined after the game started
  const me = game.players.find((p) => p.id === myId);
  // i banner sono fixed: il padding evita che coprano la cima della plancia
  const banner = !connected || spectator || me?.bankrupt;

  return (
    <div className={`flex h-dvh flex-col bg-background text-foreground ${banner ? "pt-6" : ""}`}>
      {/* skip link: prima dell'azione ci sono quaranta celle */}
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
      {/* Da md la testata è una fascia sopra le colonne; sotto md sta dentro la colonna che
          scorre, dove pinnarla costerebbe 36px fissi. */}
      {game.status !== "lobby" && <Testata game={game} className="hidden shrink-0 px-2 md:flex" />}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* panels render twice with responsive visibility: mobile below the board, desktop in the Sidebar */}
        <main className="min-h-0 flex-1 overflow-auto">
          {/* md:p-2 = stesso gutter dal bordo pagina delle sidebar; center-safe: se il
            contenuto supera l'altezza non taglia la parte alta, la lascia scrollabile */}
          <div className="flex flex-col items-center justify-center-safe sm:h-full md:p-2">
            {game.status === "lobby" ? (
              <PreMatch game={game} />
            ) : (
              <>
                <Testata game={game} className="px-3 md:hidden" />
                <Board game={game} />
                {/* la barra pollice è fixed: le si lascia sotto la sua altezza piena */}
                <div className="mt-3 w-full pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] md:hidden">
                  <GamePanels game={game} />
                </div>
              </>
            )}
          </div>
        </main>
        <Sidebar game={game} />
      </div>
    </div>
  );
}
