import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, MessageSquare } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { translate as t } from "@/lib/i18n";
import { Chat } from "@/components/Chat";
import { GamePanels } from "@/components/panels/GamePanels";

// La colonna destra. Desktop: pannelli a tutta altezza + chat collassabile in fondo.
// Mobile: bottom-sheet con la sola chat (i pannelli stanno sotto la plancia, App.tsx).
const SNAP = [0.25, 0.45]; // altezze del foglio, in frazioni di viewport

export function Sidebar({ game }: { game: PublicState }) {
  // aperta di default da md: la colonna destra restava mezza vuota con la chat chiusa
  const [chatOpen, setChatOpen] = useState(() => matchMedia("(min-width: 48rem)").matches);
  const [sheetH, setSheetH] = useState<number>();
  const [thumbBar] = useState(() => document.getElementById("barra-azione"));

  const toggle = (
    <Button
      size="icon"
      className="size-11"
      aria-label={chatOpen ? t("aria.closeChat") : t("aria.openChat")}
      onClick={() => setChatOpen((o) => !o)}
    >
      {chatOpen ? <ChevronDown /> : <MessageSquare />}
    </Button>
  );

  return (
    <>
      {/* In partita il bottone chat sta nella barra pollice, ancorato a destra: era una
          FAB che galleggiava sopra i contenuti. Fuori partita la barra non c'è, quindi
          resta flottante. */}
      {chatOpen ? null : game.status === "playing" && thumbBar ? (
        createPortal(<div className="absolute right-2 md:hidden">{toggle}</div>, thumbBar)
      ) : (
        <div className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 md:hidden">{toggle}</div>
      )}

      <aside
        style={{ "--chat-h": sheetH && `${sheetH}px` } as React.CSSProperties}
        className={`relative z-40 shrink-0 flex-col border-t border-border bg-sidebar shadow-[0_-8px_20px_-6px] shadow-black/45 ${
          chatOpen ? "flex h-[var(--chat-h,45%)]" : "hidden"
        } md:flex md:h-auto md:w-80 md:gap-2 md:border-0 md:bg-transparent md:p-2 md:shadow-none`}
      >
        <SheetHandle onResize={setSheetH} onClose={() => setChatOpen(false)} />
        <Button
          size="icon-sm"
          variant="ghost"
          className="absolute top-2 right-2 z-20 md:hidden"
          aria-label={t("aria.closeChat")}
          onClick={() => setChatOpen(false)}
        >
          <ChevronDown />
        </Button>

        {/* desktop-only: su mobile i pannelli stanno sotto la plancia */}
        {game.status !== "lobby" && (
          <div className="hidden min-h-0 md:block md:shrink-0 md:overflow-y-auto">
            <GamePanels game={game} />
          </div>
        )}
        {/* pt: il bottone di chiusura qui sopra è absolute, e stava sopra il primo messaggio */}
        <Chat open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} className="max-md:pt-9" />
      </aside>
    </>
  );
}

// Maniglia del foglio, solo mobile: si trascina fra due altezze, doppio click chiude.
function SheetHandle({ onResize, onClose }: { onResize: (h: number) => void; onClose: () => void }) {
  const snap = (v: number) => SNAP.map((f) => innerHeight * f).reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  return (
    <div
      className="absolute top-0 right-0 left-0 z-10 flex h-3 shrink-0 cursor-row-resize touch-none items-center justify-center hover:bg-ring/30 md:hidden"
      onDoubleClick={onClose}
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onResize(snap(innerHeight - e.clientY));
      }}
    >
      <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
    </div>
  );
}
