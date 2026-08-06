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
import { useT, useTileName } from "@/lib/i18n";
import { GROUP_COLOR, GROUP_LABEL, TOKEN_COLOR, serie } from "@/lib/colors";
import { euro } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TileDetails } from "./TileDetails";

// Ogni marchio dice cosa succede sulla casella.
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
export function Tile({ index, game }: { index: number; game: PublicState }) {
  const tile = BOARD[index];
  const t = useT();
  const name = useTileName()(index);
  const Icon = ENTE_ICON[tile.name] ?? KIND_ICON[tile.kind];
  const own = game.props[index];
  const owner = own ? game.players.find((p) => p.id === own.owner) : undefined;
  const side = innerSide(index);
  const isCorner = index % 10 === 0;
  const buyable = tile.price != null;
  const regione = tile.group ? GROUP_LABEL[tile.group] : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          // transform-gpu: cella isolata sul proprio layer — evita il ghosting delle bande
          // (dipinte sfalsate rispetto al box) causato dal churn di layer del filter in hover
          className="nota relative h-full w-full transform-gpu overflow-hidden font-condensed text-inherit hover:ring-1 hover:ring-paper-line hover:ring-inset focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
          // velatura bassa: il proprietario lo dice la lettera di serie, non la tinta
          style={owner ? { backgroundColor: `color-mix(in oklab, ${TOKEN_COLOR[owner.token % 8]} ${own!.mortgaged ? 8 : 16}%, var(--color-paper))` } : undefined}
        >
          {/* banda su TUTTE le celle del bordo: contenuti allineati anche senza set */}
          {!isCorner && (
            <div
              className={`absolute ${BAR[side]}`}
              title={regione}
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
              className="pointer-events-none absolute top-1/2 left-1/2 size-[4.6cqi] -translate-x-1/2 -translate-y-1/2 text-paper-line/45"
            />
          )}

          {/* tre slot ad altezza fissa: nome sopra (uguale per tutte le celle), stato al
              centro, prezzo sotto — le celle adiacenti restano allineate */}
          <div
            className={`relative flex h-full w-full flex-col items-center justify-between text-center leading-none text-[2.1cqi] ${isCorner ? "p-[0.5cqi]" : `p-[0.3cqi] ${PAD[side]}`}`}
          >
            <span className="flex w-full flex-col items-center">
              {/* intestazione: lettera del proprietario e serie, in linea. La lettera
                  era assoluta in alto a sinistra e finiva sopra al nome. */}
              {(regione || (owner && !isCorner)) && (
                <span className="flex w-full items-center justify-center gap-[0.5cqi] leading-none">
                  {owner && !isCorner && (
                    <span
                      className="shrink-0 font-mono text-[1.7cqi]"
                      style={{ color: `color-mix(in oklab, ${TOKEN_COLOR[owner.token % 8]} 55%, var(--color-paper-ink))` }}
                    >
                      {serie(owner.token)}
                    </span>
                  )}
                  {regione && <span className="min-w-0 truncate text-[1.5cqi] tracking-[0.06em] text-paper-ink/75 uppercase">{regione}</span>}
                </span>
              )}
              {/* -0.02em di tracking: recupera i 2-3px che facevano sforare
                  "Tangente", "Autostrade" ed "Equitalia" senza rimpicciolire tutto */}
              <span className="flex w-full items-start justify-center text-[2.25cqi] leading-[1.06] font-medium tracking-[-0.02em] break-words text-paper-ink">
                {name}
              </span>
            </span>
            {buyable && (
              <>
                <span className="flex min-h-0 w-full flex-1 flex-wrap items-center justify-center gap-[0.3cqi] overflow-hidden">
                  {own && own.houses === 5 ? (
                    <Hotel className="size-[3cqi] text-paper-ink" />
                  ) : (
                    Array.from({ length: own?.houses ?? 0 }, (_, h) => <House key={h} className="size-[2.1cqi] text-paper-ink" />)
                  )}
                </span>
                <span className="flex items-center justify-center font-mono leading-none tabular-nums text-paper-ink/75">{euro(tile.price ?? 0)}</span>
              </>
            )}
            {/* tasse: importo da pagare in basso, come i prezzi delle proprietà */}
            {tile.kind === "tax" && (
              <span className="flex items-center justify-center font-mono leading-none tabular-nums text-paper-ink/75">{euro(tile.taxAmount ?? 0)}</span>
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
