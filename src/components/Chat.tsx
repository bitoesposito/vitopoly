import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useGame } from "@/lib/store";
import { sendChat } from "@/lib/net/client";
import { useT } from "@/lib/i18n";
import { TOKEN_COLOR } from "@/lib/palette";

// La chat ha UNA casa sola a ogni misura: colonna destra da md in su, bottom-sheet
// sotto. Chi la ospita è Sidebar; qui c'è solo la conversazione.
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

  // chat chiusa: un messaggio nuovo diventa un toast, altrimenti passa inosservato
  const prevLen = useRef(chat.length);
  useEffect(() => {
    const m = chat.at(-1);
    if (chat.length > prevLen.current && m && !open) toast(`${m.name}: ${m.text}`);
    prevLen.current = chat.length;
  }, [chat, open]);

  useTypeToFocus(open, inputRef);

  const colorOf = (pid: string) => TOKEN_COLOR[(game?.players.find((p) => p.id === pid)?.token ?? 0) % 8];
  const time = (ts: number) => new Date(ts).toLocaleTimeString(navigator.language, { hour: "2-digit", minute: "2-digit" });
  const submit = () => {
    if (text.trim()) sendChat(text);
    setText("");
  };

  // messaggi consecutivi dello stesso mittente in un blocco solo
  const groups = chat.reduce<(typeof chat)[]>((gs, m) => {
    const last = gs.at(-1);
    if (last && last[0].pid === m.pid) last.push(m);
    else gs.push([m]);
    return gs;
  }, []);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden md:bg-card md:ring-1 md:ring-foreground/10 ${
        onToggle ? (open ? "md:min-h-0 md:flex-1" : "md:flex-none") : ""
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

// Desktop: si scrive in chat digitando, senza cliccare il campo. Il focus si sposta SOLO
// se non stai già navigando un controllo (target === body): chi gira la plancia col Tab
// non se lo vede portare via a metà strada.
function useTypeToFocus(open: boolean, inputRef: React.RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    if (!open || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (e.target !== document.body) return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, inputRef]);
}
