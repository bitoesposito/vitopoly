import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useGame } from "@/lib/store";
import { sendChat } from "@/lib/ws";
import { useT } from "@/lib/i18n";
import { TOKEN_COLOR } from "@/lib/colors";
import { GamePanels } from "@/components/Panels";

// Chat riusata su tre superfici: bottom-sheet mobile (FAB), sezione collassabile in
// fondo alla sidebar destra (con onToggle), colonna sinistra dedicata da 2xl in su
// (senza onToggle: sempre aperta, riempie l'altezza).
export function Chat({ open, onToggle, className }: { open: boolean; onToggle?: () => void; className?: string }) {
  const chat = useGame((s) => s.chat);
  const game = useGame((s) => s.game);
  const t = useT();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  // chat chiusa: nuovo messaggio -> toast. Da 2xl la colonna sinistra è sempre
  // visibile, quindi l'istanza collassabile (nascosta) non deve toastare.
  const prevLen = useRef(chat.length);
  useEffect(() => {
    const m = chat.at(-1);
    if (chat.length > prevLen.current && m && !open && !matchMedia("(min-width: 96rem)").matches) toast(`${m.name}: ${m.text}`);
    prevLen.current = chat.length;
  }, [chat, open]);

  // desktop: si scrive in chat digitando, senza cliccare il campo. Il focus viene
  // spostato SOLO se non stai già navigando un controllo (target === body): così chi
  // gira la plancia col Tab non se lo vede portare via a metà strada.
  useEffect(() => {
    if (!open || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (e.target !== document.body) return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  const colorOf = (pid: string) => TOKEN_COLOR[(game?.players.find((p) => p.id === pid)?.token ?? 0) % 8];
  const time = (ts: number) => new Date(ts).toLocaleTimeString(navigator.language, { hour: "2-digit", minute: "2-digit" });
  const submit = () => {
    if (text.trim()) sendChat(text);
    setText("");
  };

  // group consecutive messages from the same sender
  const groups = chat.reduce<(typeof chat)[]>((gs, m) => {
    const last = gs.at(-1);
    if (last && last[0].pid === m.pid) last.push(m);
    else gs.push([m]);
    return gs;
  }, []);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden md:bg-card md:ring-1 md:ring-foreground/10 ${
        onToggle ? `${open ? "md:min-h-0 md:flex-1" : "md:flex-none"}` : ""
      } ${className ?? ""}`}
    >
      {/* header desktop: titolo + toggle collasso (solo dove la chat è collassabile) */}
      <div className="hidden items-center justify-between border-b border-border p-2 md:flex">
        <span className="text-sm font-semibold">Chat</span>
        {onToggle && (
          <Button size="icon-sm" variant="outline" aria-label={open ? t("aria.closeChat") : t("aria.openChat")} onClick={onToggle}>
            {open ? <ChevronDown /> : <MessageSquare />}
          </Button>
        )}
      </div>
      <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm ${open ? "" : "md:hidden"}`}>
        {chat.length === 0 && <div className="text-xs text-muted-foreground">{t("chat.empty")}</div>}
        {groups.map((g, i) => (
          <div key={i} className="border border-border px-2 py-1">
            {/* il colore marca, non colora il nome: da inchiostro stava a 2,6:1 */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="h-3 w-1 shrink-0" style={{ background: colorOf(g[0].pid) }} />
              {g[0].name}
            </div>
            {g.map((m, j) => (
              <div key={j} className="flex items-baseline justify-between gap-2 break-words text-xs">
                <span>{m.text}</span>
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{time(m.ts)}</span>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className={`flex gap-2 border-t border-border p-2 ${open ? "" : "md:hidden"}`}>
        <Input
          ref={inputRef}
          className="h-8 flex-1"
          placeholder={t("chat.placeholder")}
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button onClick={submit} disabled={!text.trim()}>
          {t("chat.send")}
        </Button>
      </div>
    </div>
  );
}

// colonna destra. Desktop: pannelli a tutta altezza + chat collassabile in fondo.
// Mobile: FAB flottante -> bottom-sheet con la sola chat (i pannelli stanno sotto la board).
export function Sidebar({ game }: { game: PublicState }) {
  // aperta di default da md: la colonna destra restava mezza vuota con la chat chiusa
  const [chatOpen, setChatOpen] = useState(() => matchMedia("(min-width: 48rem)").matches);
  const t = useT();
  // mobile-only sheet resize, 2 snap heights; desktop is fixed width
  const [chatH, setChatH] = useState<number>();
  const snap = (v: number, steps: number[]) => steps.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

  return (
    <>
      {/* FAB mobile: toggla lo sheet; quando è aperto si sposta sopra di esso */}
      <Button
        size="icon"
        className={`fixed right-3 z-50 size-12 shadow-lg md:hidden ${game.status === "playing" ? "bottom-20" : "bottom-3"}`}
        style={chatOpen ? { bottom: `calc(${chatH ? `${chatH}px` : "45%"} + 12px)` } : undefined}
        aria-label={chatOpen ? t("aria.closeChat") : t("aria.openChat")}
        onClick={() => setChatOpen((o) => !o)}
      >
        {chatOpen ? <ChevronDown /> : <MessageSquare />}
      </Button>
      <aside
        style={{ "--chat-h": chatH && `${chatH}px` } as React.CSSProperties}
        className={`relative shrink-0 flex-col border-t border-border bg-sidebar shadow-[0_-8px_20px_-6px] shadow-black/45 ${chatOpen ? "flex h-[var(--chat-h,45%)]" : "hidden"} md:flex md:h-auto md:w-80 md:gap-2 md:border-0 md:bg-transparent md:p-2 md:shadow-none ${game.status === "lobby" ? "2xl:hidden" : ""}`}
      >
        {/* mobile-only sheet resize handle; double click chiude la chat */}
        <div
          className="absolute top-0 right-0 left-0 z-10 flex h-3 shrink-0 cursor-row-resize touch-none items-center justify-center hover:bg-ring/30 md:hidden"
          onDoubleClick={() => setChatOpen(false)}
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            setChatH(snap(innerHeight - e.clientY, [innerHeight * 0.25, innerHeight * 0.45]));
          }}
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
        </div>
        {/* desktop-only: tutto lo spazio ai pannelli (su mobile stanno sotto la board, App.tsx) */}
        {game.status !== "lobby" && (
          <div className="hidden min-h-0 md:block md:shrink-0 md:overflow-y-auto">
            <GamePanels game={game} />
          </div>
        )}
        {/* da 2xl la chat vive nella colonna sinistra (App.tsx): qui sparisce */}
        <Chat open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} className="2xl:hidden" />
      </aside>
    </>
  );
}
