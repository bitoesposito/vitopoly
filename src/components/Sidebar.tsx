import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageSquare, Moon, Sun, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useGame } from "@/lib/store";
import { sendChat } from "@/lib/ws";
import { LANGS, useT, type Lang } from "@/lib/i18n";
import { TOKEN_COLOR } from "@/lib/colors";

function LanguageToggle() {
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  const t = useT();
  return (
    <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
      <SelectTrigger size="sm" aria-label={t("aria.language")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGS.map((l) => (
          <SelectItem key={l.code} value={l.code}>
          {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ThemeToggle() {
  const theme = useGame((s) => s.theme);
  const setTheme = useGame((s) => s.setTheme);
  const t = useT();
  return (
    <Button size="icon-sm" variant="outline" aria-label={t("aria.theme")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

// Thin bar: player count (left) + chat toggle (mobile) + theme + language.
function TopBar({ chatOpen, onToggleChat }: { chatOpen: boolean; onToggleChat: () => void }) {
  const t = useT();
  const count = useGame((s) => s.game?.players.length ?? 0);
  return (
    <div className="flex items-center gap-2 border-b border-border p-2">
      <span className="mr-auto flex items-center gap-1 text-sm tabular-nums text-muted-foreground" title={t("players.title", { n: count })}>
        <Users className="size-4" />
        {count}
      </span>
      <Button size="icon-sm" variant="outline" className="lg:hidden" aria-label={chatOpen ? t("aria.closeChat") : t("aria.openChat")} onClick={onToggleChat}>
        {chatOpen ? <ChevronDown /> : <MessageSquare />}
      </Button>
      <ThemeToggle />
      <LanguageToggle />
    </div>
  );
}

function Chat({ open }: { open: boolean }) {
  const chat = useGame((s) => s.chat);
  const game = useGame((s) => s.game);
  const t = useT();
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
  const time = (ts: number) => new Date(ts).toLocaleTimeString(navigator.language, { hour: "2-digit", minute: "2-digit" });
  const submit = () => {
    if (text.trim()) sendChat(text);
    setText("");
  };

  // raggruppa messaggi consecutivi dello stesso mittente
  const groups = chat.reduce<(typeof chat)[]>((gs, m) => {
    const last = gs.at(-1);
    if (last && last[0].pid === m.pid) last.push(m);
    else gs.push([m]);
    return gs;
  }, []);

  return (
    <div className={`min-h-0 flex-1 flex-col ${open ? "flex" : "hidden lg:flex"}`}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {chat.length === 0 && <div className="text-xs text-muted-foreground">{t("chat.empty")}</div>}
        {groups.map((g, i) => (
          <div key={i} className="border border-border px-2 py-1">
            <div className="text-xs font-semibold" style={{ color: colorOf(g[0].pid) }}>
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
      <div className="flex gap-2 border-t border-border p-2">
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

export function Sidebar() {
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
        onDoubleClick={() => setChatOpen((o) => !o)} // mobile: doppio click sul bordo apre/chiude la chat
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
      <TopBar chatOpen={chatOpen} onToggleChat={() => setChatOpen(!chatOpen)} />
      <Chat open={chatOpen} />
    </aside>
  );
}
