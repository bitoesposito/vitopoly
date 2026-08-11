import {
  Banknote,
  Briefcase,
  FileStack,
  Gavel,
  HandCoins,
  Hotel,
  House,
  Lock,
  Mail,
  Mailbox,
  Milestone,
  RadioTower,
  Receipt,
  Siren,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { PublicState, TileKind } from "@tangentopoly/game";
import { translate as t, tileName as tn } from "@/lib/i18n";
import { GROUP_COLOR, GROUP_LABEL, TOKEN_COLOR } from "@/lib/palette";
import { euro } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TileDetails } from "./TileDetails";

const KIND_ICON: Partial<Record<TileKind, LucideIcon>> = {
  go: Banknote, // VIA: è lì che il denaro viene emesso
  chest: Mail, // Favori: la busta
  chance: Siren, // Blitz: la perquisizione
  jail: Lock,
  parking: Briefcase, // Latitanza: la valigia
  tax: HandCoins, // Tangente / Mazzetta
  gotojail: Gavel, // Mani Pulite
};

// chiave = nome della casella in BOARD
const ENTE_ICON: Record<string, LucideIcon> = {
  "Poste Italiane": Mailbox,
  INPS: FileStack, // la pila di pratiche
  Enel: Zap,
  RAI: RadioTower,
  Autostrade: Milestone,
  Equitalia: Receipt,
};

// Which side of the tile faces the board center (for the ink band). GO top-left.
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

// spazio riservato alla banda-set sul lato interno, per TUTTE le celle del bordo:
// così prezzo e nome stanno alla stessa quota anche dove la banda non c'è
const PAD: Record<string, string> = {
  top: "pt-1.5",
  bottom: "pb-1.5",
  left: "pl-1.5",
  right: "pr-1.5",
};

// click = popover with costs and actions
export function Tile({ index, game, landed }: { index: number; game: PublicState; landed?: boolean }) {
  const tile = BOARD[index];
  const name = tn(index);
  const Icon = ENTE_ICON[tile.name] ?? KIND_ICON[tile.kind];
  const own = game.props[index];
  const owner = own ? game.players.find((p) => p.id === own.owner) : undefined;
  const side = innerSide(index);
  const isCorner = index % 10 === 0;
  const buyable = tile.price != null;
  const region = tile.group ? GROUP_LABEL[tile.group] : undefined;
  // Le celle dei lati sono 48×31: per una riga di edifici restano 5,7px e le icone ne
  // vogliono 8, quindi lì gli edifici stanno sulla riga del prezzo, contati.
  const bassa = side === "left" || side === "right";
  const edifici =
    !bassa || !own?.houses ? null : own.houses === 5 ? (
      <Hotel className="size-[min(3cqi,1rem)] shrink-0" />
    ) : (
      <>
        <House className="size-[min(2.1cqi,0.875rem)] shrink-0" />
        {own.houses > 1 && <span>×{own.houses}</span>}
      </>
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          // transform-gpu: cella su un layer suo, o le bande fantasma dipinte fuori dal box
          // dal churn di layer del filter in hover
          className={`nota relative h-full w-full transform-gpu overflow-hidden font-condensed text-inherit ${landed ? "casella-arrivo" : ""} hover:ring-1 hover:ring-paper-line hover:ring-inset focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset`}
          // velatura decisa: sulla plancia il proprietario si legge a colpo d'occhio dal colore
          style={
            owner
              ? { backgroundColor: `color-mix(in oklab, ${TOKEN_COLOR[owner.token % 8]} ${own!.mortgaged ? 14 : 30}%, var(--color-paper))` }
              : undefined
          }
        >
          {/* banda su TUTTE le celle del bordo: contenuti allineati anche senza set */}
          {!isCorner && (
            <div
              className={`absolute ${BAR[side]}`}
              title={region}
              style={{ background: tile.group ? GROUP_COLOR[tile.group] : "var(--color-paper-line)" }}
            />
          )}

          {/* ipotecata = nota fuori corso */}
          {own?.mortgaged && (
            <span className="sovrastampa z-10">
              <span>{t("tile.mortgaged")}</span>
            </span>
          )}

          {/* filigrana */}
          {Icon && (
            <Icon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 size-[min(4.6cqi,1.5rem)] -translate-x-1/2 -translate-y-1/2 text-paper-line/45"
            />
          )}

          {/* tre slot ad altezza fissa: nome sopra (uguale per tutte le celle), stato al
              centro, prezzo sotto — le celle adiacenti restano allineate */}
          <div
            className={`relative flex h-full w-full flex-col items-center justify-between text-center text-[min(2.1cqi,0.75rem)] leading-none ${isCorner ? "p-[min(0.5cqi,0.25rem)]" : `p-[min(0.3cqi,0.125rem)] ${PAD[side]}`}`}
          >
            <span className="flex w-full flex-col items-center">
              {region && (
                <span className="w-full truncate text-[min(1.5cqi,0.5625rem)] tracking-[0.06em] text-paper-ink/75 uppercase">{region}</span>
              )}
              {/* -0.02em di tracking: i nomi lunghi (Tangente, Autostrade, Equitalia) stanno
                  nella cella senza rimpicciolire tutto */}
              <span className="flex w-full items-start justify-center text-[min(2.25cqi,0.875rem)] leading-[1.06] font-medium tracking-[-0.02em] break-words text-paper-ink">
                {name}
              </span>
            </span>
            {buyable && (
              <>
                {!bassa && (
                  <span className="flex min-h-0 w-full flex-1 flex-wrap items-center justify-center gap-[min(0.3cqi,0.125rem)] overflow-hidden text-paper-ink">
                    {own && own.houses === 5 ? (
                      <Hotel className="size-[min(3cqi,1rem)]" />
                    ) : (
                      Array.from({ length: own?.houses ?? 0 }, (_, h) => <House key={h} className="size-[min(2.1cqi,0.875rem)]" />)
                    )}
                  </span>
                )}
                <span className="flex shrink-0 items-center justify-center gap-[min(0.5cqi,0.19rem)] font-mono leading-none text-paper-ink/75 tabular-nums">
                  {euro(tile.price ?? 0)}
                  {edifici}
                </span>
              </>
            )}
            {/* tasse: importo da pagare in basso, come i prezzi delle proprietà */}
            {tile.kind === "tax" && (
              <span className="flex items-center justify-center font-mono leading-none text-paper-ink/75 tabular-nums">
                {euro(tile.taxAmount ?? 0)}
              </span>
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
