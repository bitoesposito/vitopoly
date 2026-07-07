import { CircleHelp, CircleParking, Gift, Landmark, Lock, Play, TrainFront, type LucideIcon } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState, TileKind } from "@tangentopoly/game";
import { useT, useTileName } from "@/lib/i18n";
import { TOKEN_COLOR } from "@/lib/colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TileDetails, tileDesc } from "./TileDetails";

// Caselle speciali: icona lucide (monocroma) al posto del nome.
const KIND_ICON: Partial<Record<TileKind, LucideIcon>> = {
  go: Play,
  chest: Gift,
  chance: CircleHelp,
  jail: Lock,
  parking: CircleParking,
  tax: Landmark,
};

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

// Which side of the tile faces the board center (for the color bar). GO top-left.
function innerSide(i: number): "top" | "right" | "bottom" | "left" {
  if (i % 10 === 0) return "top"; // corners: irrelevant, no group anyway
  if (i < 10) return "bottom"; // top edge
  if (i < 20) return "left"; // right edge
  if (i < 30) return "top"; // bottom edge
  return "right"; // left edge
}

const BAR: Record<string, string> = {
  top: "top-0 left-0 right-0 h-1",
  bottom: "bottom-0 left-0 right-0 h-1",
  left: "left-0 top-0 bottom-0 w-1",
  right: "right-0 top-0 bottom-0 w-1",
};

// Hover = tooltip che spiega la casella; click = popover con costi e azioni.
export function Tile({ index, game }: { index: number; game: PublicState }) {
  const tile = BOARD[index];
  const t = useT();
  const name = useTileName()(index);
  const Icon = KIND_ICON[tile.kind];
  const own = game.props[index];
  const owner = own ? game.players.find((p) => p.id === own.owner) : undefined;
  const here = game.players.filter((p) => p.pos === index && !p.bankrupt);
  const side = innerSide(index);
  const isCorner = index % 10 === 0;
  const tip = tileDesc(t, tile, game) ?? `${name}${tile.price ? ` — $${tile.price}` : ""}`;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`relative h-full w-full overflow-hidden bg-card text-inherit hover:brightness-125 ${owner ? "border-2" : ""}`}
              style={owner ? { borderColor: TOKEN_COLOR[owner.token % 8] } : undefined}
            >
              {tile.group && <div className={`absolute ${BAR[side]}`} style={{ background: GROUP_COLOR[tile.group] }} />}

              <div className={`flex h-full w-full flex-col items-center justify-center gap-px text-center font-condensed leading-none lg:font-sans xl:text-base lg:text-sm md:text-xs sm:text-[10px] text-[9px] ${isCorner ? "p-1" : "p-0.5"}`}>
                {tile.kind === "railroad" ? (
                  // icona + direzione: toglie "Stazione" (it) / "Railroad" (en), tiene Nord/Est/…
                  <span className="flex items-center justify-center gap-0.5 px-px font-medium whitespace-nowrap text-foreground">
                    <TrainFront className="size-3.5 shrink-0 sm:size-4" aria-label={name} />
                    {name.replace(/stazione\s*|\s*railroad/i, "").trim()}
                  </span>
                ) : Icon ? (
                  <Icon className="size-4 text-foreground sm:size-6" aria-label={name} />
                ) : (
                  <span className="px-px font-medium text-foreground sm:break-normal">{name}</span>
                )}
                {/* prezzo nascosto su celle piccole: sta in tooltip/popover, evita salti di riga */}
                {tile.price != null && !own && <span className="hidden text-muted-foreground sm:inline">${tile.price}</span>}
                {own?.mortgaged && <span className="font-bold text-destructive">(M)</span>}
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
                      className="size-2.5 rounded-[2px] ring-1 ring-black/40 sm:size-3"
                      style={{ background: TOKEN_COLOR[p.token % 8] }}
                    />
                  ))}
                </div>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64">
        <TileDetails index={index} game={game} />
      </PopoverContent>
    </Popover>
  );
}
