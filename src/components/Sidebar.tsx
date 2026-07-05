import { useEffect, useRef, useState } from "react";
import { ChevronDown, Crown, Lock, MessageSquare, Palmtree, Share2, Ticket, WifiOff } from "lucide-react";
import type { PublicState } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useGame } from "@/lib/store";
import { sendChat } from "@/lib/ws";
import { TOKEN_COLOR } from "@/lib/colors";

const dot = (token: number) => (
  <span className="size-3 shrink-0 rounded-full ring-1 ring-black/40" style={{ background: TOKEN_COLOR[token % 8] }} /> // ponytail: black ring = contrasto outline sui colori pedina, non è un token themabile
);

// Full list shown inside the dialog.
function PlayerList({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  return (
    <div className="space-y-1">
      {game.players.map((p, i) => {
        const isTurn = game.status === "playing" && game.players[game.current]?.id === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${isTurn ? "bg-accent text-accent-foreground ring-1 ring-ring" : ""} ${p.bankrupt ? "opacity-40" : ""}`}
          >
            {dot(p.token)}
            <span className="truncate font-medium">
              {p.name}
              {p.id === myId && <span className="text-muted-foreground"> (tu)</span>}
            </span>
            {i === 0 && <Crown className="size-3.5 text-warning" aria-label="host" />}
            {p.inJail && <Lock className="size-3.5 text-muted-foreground" aria-label="in prigione" />}
            {p.jailCards > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Ticket className="size-3.5" />×{p.jailCards}
              </span>
            )}
            {!p.connected && <WifiOff className="size-3.5 text-muted-foreground" aria-label="disconnesso" />}
            {game.status !== "lobby" && <span className="ml-auto tabular-nums text-success">${p.cash}</span>}
          </div>
        );
      })}
      {game.status === "playing" && game.settings.vacationCash && (
        <div className="flex items-center gap-1.5 px-2 pt-1 text-xs text-muted-foreground">
          <Palmtree className="size-3.5" /> Vacation pot <span className="ml-auto tabular-nums text-warning">${game.vacationPot}</span>
        </div>
      )}
    </div>
  );
}

// Inline top bar: horizontally-scrollable player chips (tap = dialog) + chat toggle + share.
function TopBar({ game, chatOpen, onToggleChat }: { game: PublicState; chatOpen: boolean; onToggleChat: () => void }) {
  const myId = useGame((s) => s.myId);
  const code = useGame((s) => s.code);
  const link = `${location.origin}${location.pathname}?room=${code}`;

  const share = async () => {
    // solo vero mobile (niente mouse) → pannello nativo; desktop copia sempre
    if (typeof navigator.share === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "vitopoly", text: "Unisciti alla partita!", url: link });
        return;
      } catch {
        // annullato / non supportato → fallback copia
      }
    }
    await navigator.clipboard.writeText(link);
    toast.success("Link copiato negli appunti");
  };

  return (
    <div className="flex items-center gap-2 border-b border-border p-2">
      <Dialog>
        <DialogTrigger asChild>
          <button className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-md py-0.5 text-left hover:bg-accent">
            {game.players.map((p) => {
              const isTurn = game.status === "playing" && game.players[game.current]?.id === p.id;
              return (
                <span
                  key={p.id}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs ${isTurn ? "bg-accent ring-1 ring-ring" : ""} ${p.bankrupt ? "opacity-40" : ""}`}
                >
                  {dot(p.token)}
                  <span className="max-w-24 truncate">
                    {p.name}
                    {p.id === myId && " (tu)"}
                  </span>
                </span>
              );
            })}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giocatori ({game.players.length})</DialogTitle>
          </DialogHeader>
          <PlayerList game={game} />
        </DialogContent>
      </Dialog>
      <Button size="icon-sm" variant="ghost" className="lg:hidden" aria-label={chatOpen ? "Chiudi chat" : "Apri chat"} onClick={onToggleChat}>
        {chatOpen ? <ChevronDown /> : <MessageSquare />}
      </Button>
      <Button size="icon-sm" variant="secondary" aria-label="Condividi partita" title={`room ${code}`} onClick={share}>
        <Share2 />
      </Button>
    </div>
  );
}

function Chat({ open }: { open: boolean }) {
  const chat = useGame((s) => s.chat);
  const game = useGame((s) => s.game);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  // chat chiusa (mobile): nuovo messaggio → toast
  const prevLen = useRef(chat.length);
  useEffect(() => {
    const m = chat.at(-1);
    if (chat.length > prevLen.current && m && !open) toast(`${m.name}: ${m.text}`);
    prevLen.current = chat.length;
  }, [chat, open]);

  // desktop: digitare ovunque scrive in chat (unico target da tastiera dell'app)
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const colorOf = (pid: string) => TOKEN_COLOR[(game?.players.find((p) => p.id === pid)?.token ?? 0) % 8];
  const submit = () => {
    if (text.trim()) sendChat(text);
    setText("");
  };

  return (
    <div className={`min-h-0 flex-1 flex-col ${open ? "flex" : "hidden lg:flex"}`}>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {chat.length === 0 && <div className="text-xs text-muted-foreground">Nessun messaggio. Scrivi qualcosa 👋</div>}
        {chat.map((m, i) => (
          <div key={i} className="mb-0 break-words text-xs sm:text-sm">
            <span className="font-semibold" style={{ color: colorOf(m.pid) }}>
              {m.name}
            </span>
            <span className="text-muted-foreground"> {m.text}</span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2 border-t border-border p-2">
        <Input
          ref={inputRef}
          className="h-8 flex-1"
          placeholder="Messaggio…"
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button onClick={submit} disabled={!text.trim()}>
          Invia
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ game }: { game: PublicState }) {
  const [chatOpen, setChatOpen] = useState(true); // collapse solo mobile: toggle nascosto su lg
  // ponytail: resize fai-da-te via CSS var — le media query scelgono quale applicare
  // (altezza sotto lg, larghezza da lg in su). shadcn resizable se servissero più pannelli.
  // 3 step (stretta/media/larga): il drag snappa al più vicino, gli estremi fanno da min/max.
  const [size, setSize] = useState<{ h?: number; w?: number }>({});
  const snap = (v: number, steps: number[]) => steps.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

  return (
    <aside
      style={{ "--chat-h": size.h && `${size.h}px`, "--chat-w": size.w && `${size.w}px` } as React.CSSProperties}
      className={`relative flex shrink-0 flex-col border-t border-border bg-sidebar shadow-[0_-8px_20px_-6px] shadow-black/45 lg:h-auto lg:w-[var(--chat-w,20rem)] lg:border-t-0 lg:border-l lg:shadow-[-8px_0_20px_-6px] ${chatOpen ? "h-[var(--chat-h,45%)]" : "h-auto"}`}
    >
      <div
        className="absolute top-0 right-0 left-0 z-10 flex h-3 shrink-0 cursor-row-resize touch-none items-center justify-center hover:bg-ring/30 lg:right-auto lg:bottom-0 lg:h-auto lg:w-1.5 lg:cursor-col-resize"
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          setSize({
            h: snap(innerHeight - e.clientY, [innerHeight * 0.25, innerHeight * 0.45, innerHeight * 0.7]),
            w: snap(innerWidth - e.clientX, [260, 320, 440]),
          });
        }}
      >
        {/* grabber stile bottom-sheet: hint visivo del resize su mobile */}
        <span className="h-1 w-10 rounded-full bg-muted-foreground/40 lg:hidden" />
      </div>
      <TopBar game={game} chatOpen={chatOpen} onToggleChat={() => setChatOpen(!chatOpen)} />
      <Chat open={chatOpen} />
    </aside>
  );
}
