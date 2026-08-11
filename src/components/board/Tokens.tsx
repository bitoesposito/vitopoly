import { useEffect, useRef, useState } from "react";
import { walkTiles } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { TOKEN_COLOR, tokenLetter } from "@/lib/palette";
import { tileCell, walkMs } from "@/lib/board-layout";
import { useGame } from "@/lib/store";

// board grid tracks: 1.55fr corners, 1fr edges
const TRACKS = [1.55, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.55];
const TOTAL = TRACKS.reduce((a, b) => a + b, 0);
const centerPct = (n: number) => ((TRACKS.slice(0, n - 1).reduce((a, b) => a + b, 0) + TRACKS[n - 1] / 2) / TOTAL) * 100;

const pct = (i: number): readonly [number, number] => {
  const { row, col } = tileCell(i);
  return [centerPct(col), centerPct(row)];
};

// rAF along the tile-center polyline: follows the board edge, global ease-out, 200ms.
// `back` = si cammina a ritroso, invece del giro lungo nell'unico verso del gioco.
function useEdgeWalk(target: number, back?: boolean): readonly [number, number] {
  const [xy, setXy] = useState(() => pct(target));
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    // a new target mid-animation restarts from the old target, not from mid-path
    const path = walkTiles(from, target, back);
    const n = path.length - 1;
    const pts = path.map(pct);
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    const dur = walkMs(n); // scale with distance: ~245ms short hops, capped for long runs
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      let d = (1 - (1 - t) ** 3) * total; // ease-out cubic
      let i = 0;
      while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
      const k = seg[i] ? d / seg[i] : 1;
      setXy([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, back]);
  return xy;
}

// fixed per-token offsets so stacked tokens stay visible
const SPREAD = [
  [0, 0],
  [9, 7],
  [-9, 7],
  [9, -7],
  [-9, -7],
  [0, 11],
  [0, -11],
  [15, 0],
];

function Token({ token, pos, back, current, solo }: { token: number; pos: number; back?: boolean; current: boolean; solo: boolean }) {
  const [x, y] = useEdgeWalk(pos, back);
  const color = TOKEN_COLOR[token % 8];
  const [dx, dy] = solo ? [0, 0] : SPREAD[token % 8]; // lo scarto serve solo a non coprirsi
  return (
    // l'overlay è pointer-events-none: niente tooltip, l'identità è la lettera
    <div className={`absolute ${current ? "z-20" : "z-10"}`} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden>
      <div
        className="relative transition-transform duration-300"
        style={{ transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}
      >
        {current && <span className="absolute -inset-2 animate-ping opacity-35" style={{ background: color }} />}
        <span
          className={`flex items-center justify-center font-mono leading-none ring-1 ring-paper-ink/50 transition-all duration-300 ${
            current
              ? "size-5 text-2xs ring-2 ring-offset-2 ring-offset-background sm:size-6 sm:text-xs"
              : "size-4 text-micro opacity-95 sm:size-[1.15rem]"
          }`}
          style={{ background: color, color: "var(--color-paper-ink)" }}
        >
          {tokenLetter(token)}
        </span>
      </div>
    </div>
  );
}

// overlay above the board; clicks fall through to the tiles
export function Tokens({ game }: { game: PublicState }) {
  const currentId = game.players[game.current]?.id;
  const tokenStep = useGame((s) => s.tokenStep); // choreographed display pos (ws.ts); state pos is the fallback
  const vivi = game.players.filter((p) => !p.bankrupt);
  const dove = (p: (typeof vivi)[number]) => tokenStep[p.id]?.pos ?? p.pos; // posizione MOSTRATA
  const solo = (p: (typeof vivi)[number]) => vivi.every((o) => o === p || dove(o) !== dove(p));
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {vivi.map((p) => (
        <Token
          key={p.id}
          token={p.token}
          pos={dove(p)}
          back={tokenStep[p.id]?.back}
          current={game.status === "playing" && p.id === currentId}
          solo={solo(p)}
        />
      ))}
    </div>
  );
}
