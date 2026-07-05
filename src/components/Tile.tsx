import { BOARD } from "@vitopoly/game";
import type { PublicState } from "@vitopoly/game";

const GROUP_COLOR: Record<string, string> = {
  brown: "#955436",
  lightblue: "#aae0fa",
  pink: "#d93a96",
  orange: "#f7941d",
  red: "#ed1b24",
  yellow: "#fef200",
  green: "#1fb25a",
  darkblue: "#0072bb",
};

import { TOKEN_COLOR } from "@/lib/colors";

const KIND_ICON: Record<string, string> = {
  go: "🏁",
  railroad: "🚂",
  utility: "⚡",
  tax: "💸",
  chance: "❓",
  chest: "📦",
  jail: "🚔",
  gotojail: "☠️",
  parking: "🏝",
};

// Which side of the tile faces the board center (for the color bar). GO top-left.
function innerSide(i: number): "top" | "right" | "bottom" | "left" {
  if (i % 10 === 0) return "top"; // corners: irrelevant, no group anyway
  if (i < 10) return "bottom"; // top edge
  if (i < 20) return "left"; // right edge
  if (i < 30) return "top"; // bottom edge
  return "right"; // left edge
}

const BAR: Record<string, string> = {
  top: "top-0 left-0 right-0 h-[14%]",
  bottom: "bottom-0 left-0 right-0 h-[14%]",
  left: "left-0 top-0 bottom-0 w-[14%]",
  right: "right-0 top-0 bottom-0 w-[14%]",
};

export function Tile({ index, game }: { index: number; game: PublicState }) {
  const tile = BOARD[index];
  const own = game.props[index];
  const owner = own ? game.players.find((p) => p.id === own.owner) : undefined;
  const here = game.players.filter((p) => p.pos === index && !p.bankrupt);
  const side = innerSide(index);
  const isCorner = index % 10 === 0;

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[4px] border bg-card ${owner ? "" : "border-border"}`}
      style={owner ? { borderColor: TOKEN_COLOR[owner.token % 8] } : undefined}
      title={`${tile.name}${tile.price ? ` — $${tile.price}` : ""}`}
    >
      {tile.group && <div className={`absolute ${BAR[side]}`} style={{ background: GROUP_COLOR[tile.group] }} />}

      <div className={`flex h-full w-full flex-col items-center justify-center gap-px p-0.5 text-center ${isCorner ? "text-[10px]" : "text-[7px] sm:text-[8px]"}`}>
        {KIND_ICON[tile.kind] && <span className={isCorner ? "text-base" : "text-[10px]"}>{KIND_ICON[tile.kind]}</span>}
        <span className="line-clamp-2 leading-[1.1] font-medium text-foreground">{tile.name}</span>
        {tile.price != null && !own && <span className="text-muted-foreground">${tile.price}</span>}
        {own?.mortgaged && <span className="font-bold text-destructive">IPOTECATA</span>}
        {(own?.houses ?? 0) > 0 && (
          <span className="text-[8px] leading-none">{own!.houses === 5 ? "🏨" : "🏠".repeat(own!.houses)}</span>
        )}
      </div>

      {here.length > 0 && (
        <div className="absolute right-0.5 bottom-0.5 flex flex-wrap justify-end gap-0.5">
          {here.map((p) => (
            <span
              key={p.id}
              title={p.name}
              className="size-2.5 rounded-full ring-1 ring-black/40 sm:size-3"
              style={{ background: TOKEN_COLOR[p.token % 8] }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
