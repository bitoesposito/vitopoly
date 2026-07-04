import { useEffect, useRef, useState } from "react";
import type { PublicState } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { useGame } from "@/lib/store";
import { sendChat } from "@/lib/ws";
import { TOKEN_COLOR } from "@/lib/colors";

function ShareLink() {
  const code = useGame((s) => s.code);
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?room=${code}`;
  return (
    <div className="flex items-center gap-2 border-b border-white/10 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">room {code}</div>
        <div className="truncate text-xs text-slate-300">{link}</div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="rounded-md"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "✓" : "Copia"}
      </Button>
    </div>
  );
}

function Players({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  return (
    <div className="space-y-1 border-b border-white/10 p-3">
      {game.players.map((p, i) => {
        const isTurn = game.status === "playing" && game.players[game.current]?.id === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${isTurn ? "bg-indigo-500/20 ring-1 ring-indigo-400/40" : ""} ${p.bankrupt ? "opacity-40" : ""}`}
          >
            <span className="size-3 shrink-0 rounded-full ring-1 ring-black/40" style={{ background: TOKEN_COLOR[p.token % 8] }} />
            <span className="truncate font-medium">
              {p.name}
              {p.id === myId && <span className="text-slate-400"> (tu)</span>}
            </span>
            {i === 0 && <span title="host">👑</span>}
            {p.inJail && <span title="in prigione">🔒</span>}
            {p.jailCards > 0 && <span className="text-[10px] text-slate-400">🎟×{p.jailCards}</span>}
            {!p.connected && <span title="disconnesso">⚠️</span>}
            {game.status !== "lobby" && <span className="ml-auto tabular-nums text-emerald-300">${p.cash}</span>}
          </div>
        );
      })}
      {game.status === "playing" && game.settings.vacationCash && (
        <div className="flex items-center gap-2 px-2 pt-1 text-xs text-slate-400">
          🏝 Vacation pot <span className="ml-auto tabular-nums text-amber-300">${game.vacationPot}</span>
        </div>
      )}
    </div>
  );
}

function Chat() {
  const chat = useGame((s) => s.chat);
  const game = useGame((s) => s.game);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [chat.length]);

  const colorOf = (pid: string) => TOKEN_COLOR[(game?.players.find((p) => p.id === pid)?.token ?? 0) % 8];
  const submit = () => {
    if (text.trim()) sendChat(text);
    setText("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {chat.length === 0 && <div className="text-xs text-slate-500">Nessun messaggio. Scrivi qualcosa 👋</div>}
        {chat.map((m, i) => (
          <div key={i} className="break-words">
            <span className="font-semibold" style={{ color: colorOf(m.pid) }}>
              {m.name}
            </span>
            <span className="text-slate-300"> {m.text}</span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2 border-t border-white/10 p-2">
        <input
          className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 text-sm outline-none placeholder:text-slate-500 focus:border-indigo-400"
          placeholder="Messaggio…"
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button size="sm" className="rounded-md" onClick={submit} disabled={!text.trim()}>
          ➤
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ game }: { game: PublicState }) {
  return (
    <aside className="flex h-64 shrink-0 flex-col border-t border-white/10 bg-[#12122b] lg:h-auto lg:w-80 lg:border-t-0 lg:border-l">
      <ShareLink />
      <Players game={game} />
      <Chat />
    </aside>
  );
}
