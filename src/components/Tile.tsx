import { CircleHelp, CircleParking, Gift, Hotel, House, Landmark, Lock, Play, TrainFront, type LucideIcon } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState, TileKind } from "@tangentopoly/game";
import { useT, useTileName } from "@/lib/i18n";
import { GROUP_COLOR, TOKEN_COLOR } from "@/lib/colors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TileDetails } from "./TileDetails";

// special tiles: icon instead of name
const KIND_ICON: Partial<Record<TileKind, LucideIcon>> = {
  go: Play,
  chest: Gift,
  chance: CircleHelp,
  jail: Lock,
  parking: CircleParking,
  tax: Landmark,
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

// click = popover with costs and actions
export function Tile({ index, game }: { index: number; game: PublicState }) {
  const tile = BOARD[index];
  const t = useT();
  const name = useTileName()(index);
  const Icon = KIND_ICON[tile.kind];
  const own = game.props[index];
  const owner = own ? game.players.find((p) => p.id === own.owner) : undefined;
  const side = innerSide(index);
  const isCorner = index % 10 === 0;
  const buyable = tile.price != null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-full w-full overflow-hidden bg-card text-inherit hover:brightness-125"
          // cella tinta del colore del proprietario: color-mix col fondo tiene leggibile
          // ciò che ci sta sopra; ipotecata = tinta quasi spenta
          style={owner ? { background: `color-mix(in oklab, ${TOKEN_COLOR[owner.token % 8]} ${own!.mortgaged ? 14 : 32}%, var(--color-card))` } : undefined}
        >
          {tile.group && <div className={`absolute ${BAR[side]}`} style={{ background: GROUP_COLOR[tile.group] }} />}

          {/* nastro da sequestro: proprietà ipotecata */}
          {own?.mortgaged && (
            <span
              aria-label={t("tile.mortgaged")}
              className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex min-h-[0.9em] w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-30 items-center justify-center"
              style={{ background: "repeating-linear-gradient(45deg, #eab308 0 .6em, #18181b .6em 1.2em)" }}
            >
              <span className="hidden text-[0.6em] font-black tracking-wider text-black uppercase lg:inline"
              style={{textShadow: `-1px -1px 0 #eab308, 1px -1px 0 #eab308, -1px 1px 0 #eab308, 1px 1px 0 #eab308`}}>
                {t("tile.mortgaged")}
              </span>
            </span>
          )}

          {/* tre slot ad altezza fissa: nome sopra, stato al centro, prezzo sotto —
              così le celle adiacenti restano allineate a prescindere dal contenuto */}
          <div className={`flex h-full w-full flex-col items-center text-center font-condensed leading-none lg:font-sans xl:text-base lg:text-sm md:text-xs sm:text-[0.625rem] text-[0.5625rem] ${buyable ? "justify-between" : "justify-center gap-px"} ${isCorner ? "p-1" : "p-0.5"}`}>
            {buyable ? (
              <span className="flex h-[2.5em] w-full items-center justify-center px-px font-medium break-words text-foreground">
                {tile.kind === "railroad" ? (
                  <span className="flex flex-col items-center justify-center gap-0.5 sm:flex-row">
                    <TrainFront className="hidden size-3.5 shrink-0 sm:block sm:size-4" aria-label={name} />
                    {name.replace(/stazione\s*/i, "").trim()}
                  </span>
                ) : (
                  name
                )}
              </span>
            ) : Icon ? (
              <Icon className="size-4 text-foreground sm:size-6" aria-label={name} />
            ) : (
              <span className="px-px font-medium text-foreground sm:break-normal">{name}</span>
            )}
            {buyable && (
              <>
                <span className="flex min-h-0 w-full flex-1 flex-wrap items-center justify-center gap-0.5">
                  {own && own.houses === 5 ? (
                    <Hotel className="size-3 text-foreground lg:size-4" />
                  ) : (
                    Array.from({ length: own?.houses ?? 0 }, (_, h) => <House key={h} className="size-2.5 text-foreground lg:size-3.5" />)
                  )}
                </span>
                <span className="flex h-[1.2em] items-center justify-center text-muted-foreground">
                  <span className="hidden sm:inline">${tile.price}</span>
                </span>
              </>
            )}
          </div>

        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <TileDetails index={index} game={game} />
      </PopoverContent>
    </Popover>
  );
}
