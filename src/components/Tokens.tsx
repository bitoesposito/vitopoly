import { useEffect, useRef, useState } from "react";
import type { PublicState } from "@tangentopoly/game";
import { TOKEN_COLOR } from "@/lib/colors";
import { tileCell } from "@/lib/utils";

// board grid tracks: 1.55fr corners, 1fr edges
const TRACKS = [1.55, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.55];
const TOTAL = TRACKS.reduce((a, b) => a + b, 0);
const centerPct = (n: number) =>
  ((TRACKS.slice(0, n - 1).reduce((a, b) => a + b, 0) + TRACKS[n - 1] / 2) / TOTAL) * 100;

const pct = (i: number): readonly [number, number] => {
  const { row, col } = tileCell(i);
  return [centerPct(col), centerPct(row)];
};

// rAF along the tile-center polyline: follows the board edge, global ease-out, 200ms
function useEdgeWalk(target: number): readonly [number, number] {
  const [xy, setXy] = useState(() => pct(target));
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    // a new target mid-animation restarts from the old target, not from mid-path
    const n = (target - from + 40) % 40;
    const pts = Array.from({ length: n + 1 }, (_, i) => pct((from + i) % 40));
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    const dur = Math.min(300 + n * 45, 800); // scale with distance: ~245ms short hops, capped for long runs
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
  }, [target]);
  return xy;
}

// fixed per-token offsets so stacked tokens stay visible
const SPREAD = [
  [0, 0], [9, 7], [-9, 7], [9, -7], [-9, -7], [0, 11], [0, -11], [15, 0],
];

function Token({ name, token, pos, current }: { name: string; token: number; pos: number; current: boolean }) {
  const [x, y] = useEdgeWalk(pos);
  const color = TOKEN_COLOR[token % 8];
  const [dx, dy] = current ? [0, 0] : SPREAD[token % 8];
  return (
    <div
      className={`absolute ${current ? "z-20" : "z-10"}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      title={name}
    >
      <div
        className="relative transition-transform duration-300"
        style={{ transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}
      >
        {current && <span className="absolute -inset-2 animate-ping rounded-full opacity-40" style={{ background: color }} />}
        <span
          className={`block rounded-[3px] ring-black/40 transition-all duration-300 ${
            current ? "size-4 ring-2 ring-offset-2 ring-offset-background sm:size-5" : "size-2.5 opacity-90 ring-1 sm:size-3"
          }`}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// overlay above the board; clicks fall through to the tiles
export function Tokens({ game }: { game: PublicState }) {
  const currentId = game.players[game.current]?.id;
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {game.players.filter((p) => !p.bankrupt).map((p) => (
        <Token key={p.id} name={p.name} token={p.token} pos={p.pos} current={game.status === "playing" && p.id === currentId} />
      ))}
    </div>
  );
}
