import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Handshake, Hotel, House, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { BOARD } from "@tangentopoly/game";
import type { Bundle, Player, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { useGame } from "@/lib/store";
import { GROUP_COLOR, GROUP_LABEL, TOKEN_COLOR, serie } from "@/lib/colors";
import { euro } from "@/lib/utils";
import { AzioniProprieta } from "./AzioniProprieta";
import { PlayerList } from "./PlayerList";
import { AuctionPanel } from "./AuctionPanel";

function Panel({ ring, children }: { ring?: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className={ring}>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

const propsOf = (game: PublicState, pid: string) =>
  Object.entries(game.props).filter(([, o]) => o!.owner === pid).map(([k]) => Number(k));

// Talloncino d'atto: serie (filetto + nome), nome, stato — prezzo, case, ipoteca.
function PropCell({ game, tile, sel, onClick }: { game: PublicState; tile: number; sel: boolean; onClick: () => void }) {
  const tn = useTileName();
  const t = useT();
  const o = game.props[tile];
  const def = BOARD[tile];
  const g = def.group ?? "";
  return (
    <button
      type="button"
      title={tn(tile)}
      onClick={onClick}
      className={`nota border p-1.5 text-left text-2xs leading-tight transition-colors ${sel ? "border-verde-carta ring-1 ring-verde-carta" : "border-paper-line/60 hover:border-paper-line"}`}
    >
      <span className="mb-1 block h-px w-full" style={{ background: GROUP_COLOR[g] ?? "var(--color-muted-foreground)" }} />
      {GROUP_LABEL[g] && <div className="truncate text-micro tracking-widest text-paper-ink/70 uppercase">{GROUP_LABEL[g]}</div>}
      <div className="truncate font-medium">{tn(tile)}</div>
      <div className="flex h-3.5 items-center gap-0.5 text-paper-ink/70">
        {o?.mortgaged ? (
          <span className="font-condensed text-micro tracking-widest text-sanguigna-carta uppercase">{t("tile.mortgaged")}</span>
        ) : o && o.houses === 5 ? (
          <Hotel className="size-3 text-paper-ink" />
        ) : o && o.houses > 0 ? (
          <>
            <House className="size-3 text-paper-ink" />
            <span>×{o.houses}</span>
          </>
        ) : (
          <span className="font-mono tabular-nums">{euro(def.price ?? 0)}</span>
        )}
      </div>
    </button>
  );
}

// Le mie proprietà: tocchi una cella e sotto compaiono le azioni per QUELLA proprietà,
// a tutta larghezza invece che spalmate su ogni riga.
export function AssetsPanel({ game, myId }: { game: PublicState; myId: string }) {
  const t = useT();
  const [sel, setSel] = useState<number | null>(null);
  const mine = propsOf(game, myId);
  // quando cosa si può fare lo decide AzioniProprieta: qui basta sapere cosa è scelto
  const selTile = sel !== null && mine.includes(sel) ? sel : null; // venduta/scambiata -> selezione decade

  return (
    <Panel>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <House className="size-3.5" />
        {t("assets.title", { n: mine.length })}
      </div>
      {mine.length === 0 ? (
        <div className="text-xs text-muted-foreground">{t("trade.noProps")}</div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {mine.map((tl) => (
            <PropCell key={tl} game={game} tile={tl} sel={selTile === tl} onClick={() => setSel(selTile === tl ? null : tl)} />
          ))}
        </div>
      )}
      {selTile !== null && (
        <div key={selTile} className="duration-200 animate-in fade-in">
          <AzioniProprieta game={game} myId={myId} tile={selTile} />
        </div>
      )}
    </Panel>
  );
}

const emptyBundle = (b: Bundle) => b.cash === 0 && b.props.length === 0 && b.jailCards === 0;

// Un lato dell'offerta nel composer: cash, griglia delle proprietà a celle con la
// striscia del colore del set (l'ordine di tabellone tiene i set adiacenti), carte
// prigione. Stesso linguaggio visivo del pannello asta.
function BundleEditor({ game, player, title, accent, cash, setCash, picked, setPicked, jail, setJail }: {
  game: PublicState; player: Player; title: string; accent: string;
  cash: string; setCash: (v: string) => void;
  picked: number[]; setPicked: (v: number[]) => void;
  jail: number; setJail: (v: number) => void;
}) {
  const tr = useT();
  const tiles = propsOf(game, player.id);

  return (
    <div className="space-y-1.5 border border-border/60 bg-muted/20 p-2">
      <div className={`text-2xs font-semibold tracking-wide uppercase ${accent}`}>{title}</div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">€</span>
        <Input className="h-7 flex-1 tabular-nums" type="number" min={0} max={player.cash} value={cash} onChange={(e) => setCash(e.target.value)} />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">/ €{player.cash}</span>
      </div>
      {tiles.length === 0 ? (
        <div className="text-xs text-muted-foreground">{tr("trade.noProps")}</div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {tiles.map((t) => {
            const sel = picked.includes(t);
            return (
              <PropCell key={t} game={game} tile={t} sel={sel} onClick={() => setPicked(sel ? picked.filter((x) => x !== t) : [...picked, t])} />
            );
          })}
        </div>
      )}
      {player.jailCards > 0 && (
        <div className="flex gap-1">
          {Array.from({ length: player.jailCards }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`carta prigione ${i + 1}`}
              onClick={() => setJail(jail === i + 1 ? i : i + 1)}
              className={`border p-1 transition-colors ${i < jail ? "border-success bg-success/15 ring-1 ring-success" : "border-border bg-muted/40 hover:bg-muted"}`}
            >
              <Ticket className="size-3.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Vista "nuovo scambio": partner a chips, poi i due lati specchiati (dai/ricevi)
function TradeComposer({ game, myId }: { game: PublicState; myId: string }) {
  const tr = useT();
  const close = () => useGame.setState({ tradeOpen: false });
  const [to, setTo] = useState("");
  const [giveCash, setGiveCash] = useState("0");
  const [getCash, setGetCash] = useState("0");
  const [giveProps, setGiveProps] = useState<number[]>([]);
  const [getProps, setGetProps] = useState<number[]>([]);
  const [giveJail, setGiveJail] = useState(0);
  const [getJail, setGetJail] = useState(0);

  const me = game.players.find((p) => p.id === myId)!; // il composer si apre solo da giocatori vivi
  const other = game.players.find((p) => p.id === to);
  const others = game.players.filter((p) => p.id !== myId && !p.bankrupt);
  const pick = (id: string) => {
    setTo(id);
    setGetProps([]); // gli asset selezionati appartenevano al partner precedente
    setGetCash("0");
    setGetJail(0);
  };

  const give: Bundle = { cash: Number(giveCash) || 0, props: giveProps, jailCards: giveJail };
  const get: Bundle = { cash: Number(getCash) || 0, props: getProps, jailCards: getJail };

  return (
    <div className="space-y-2.5 text-sm">
      <div className="flex flex-wrap gap-1">
        {others.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            className={`flex items-center gap-1.5 border px-2 py-1 text-xs transition-colors ${to === p.id ? "border-success bg-success/15 ring-1 ring-success" : "border-border hover:bg-muted"}`}
          >
            <span
              className="flex size-4 shrink-0 items-center justify-center font-mono text-micro leading-none ring-1 ring-paper-ink/50"
              style={{ background: TOKEN_COLOR[p.token % 8], color: "var(--color-paper-ink)" }}
            >
              {serie(p.token)}
            </span>
            {p.name}
          </button>
        ))}
      </div>

      <BundleEditor game={game} player={me} title={tr("trade.youGive")} accent="text-destructive"
        cash={giveCash} setCash={setGiveCash} picked={giveProps} setPicked={setGiveProps} jail={giveJail} setJail={setGiveJail} />

      {other ? (
        <BundleEditor game={game} player={other} title={tr("trade.youGet")} accent="text-success"
          cash={getCash} setCash={setGetCash} picked={getProps} setPicked={setGetProps} jail={getJail} setJail={setGetJail} />
      ) : (
        <div className="text-xs text-muted-foreground">{tr("trade.pickPlayer")}</div>
      )}

      <Button
        className="w-full"
        size="sm"
        disabled={!to || (emptyBundle(give) && emptyBundle(get))}
        onClick={() => {
          send({ type: "proposeTrade", to, give, get });
          close();
        }}
      >
        {tr("trade.send")}
      </Button>
    </div>
  );
}

// una parte dell'offerta come chips: cash, atti (pallino colore gruppo), carte prigione.
// `fly` = variante animata (EventCard): le chips volano nella direzione dello scambio.
export function BundleChips({ b, fly, paper }: { b: Bundle; fly?: "r" | "l"; paper?: boolean }) {
  const tr = useT();
  const tn = useTileName();
  const chips: React.ReactNode[] = [];
  if (b.cash > 0) chips.push(<span key="€" className={`font-mono font-semibold ${paper ? "text-verde-carta" : "text-success"}`}>{euro(b.cash)}</span>);
  for (const t of b.props)
    chips.push(
      <span key={t} className="flex items-center gap-1">
        <span className="size-2 shrink-0 rounded-full" style={{ background: GROUP_COLOR[BOARD[t].group ?? ""] ?? "var(--color-muted-foreground)" }} />
        {tn(t)}
      </span>,
    );
  if (b.jailCards > 0)
    chips.push(
      <span key="j" className="flex items-center gap-1">
        <Ticket className="size-3" />×{b.jailCards}
      </span>,
    );
  if (chips.length === 0) return <span className={`text-xs ${paper ? "text-paper-ink/60" : "text-muted-foreground"}`}>{tr("bundle.nothing")}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`flex items-center border px-1.5 py-0.5 text-xs ${paper ? "border-paper-line/60 text-paper-ink" : "border-border bg-muted"} ${fly ? `chip-fly-${fly}` : ""}`}
          style={fly ? { animationDelay: `${250 + i * 130}ms` } : undefined}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

// Pannello Scambi navigabile: lista <-> dettaglio. Una proposta nuova apre da sola il
// dettaglio e resta listata (con "Mostra") finché non si conclude.
export function TradePanel({ game, myId }: { game: PublicState; myId: string }) {
  const tr = useT();
  const tradeOpen = useGame((s) => s.tradeOpen);
  const hidden = useGame((s) => s.tradeHidden);
  // su mobile la proposta arriva sotto la piega, dentro un timer da 60s
  const seen = useRef<string[]>([]);
  useEffect(() => {
    const mine = game.trades.filter((t) => t.to === myId);
    const fresh = mine.filter((t) => !seen.current.includes(t.id));
    seen.current = mine.map((t) => t.id);
    for (const t of fresh) {
      const from = game.players.find((p) => p.id === t.from)?.name ?? "";
      toast(tr("trade.incoming", { name: from }));
    }
  }, [game.trades, game.players, myId, tr]);
  const inAuction = game.stack.some((f) => f.t === "auction"); // il motore vieta gli scambi in asta
  const me = game.players.find((p) => p.id === myId); // spectators/bankrupt can't trade
  const incoming = game.trades.filter((t) => t.to === myId);
  const outgoing = game.trades.filter((t) => t.from === myId);
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  const setHidden = (id: string, v: boolean) => useGame.setState((s) => ({ tradeHidden: { ...s.tradeHidden, [id]: v } }));

  const compose = !inAuction && tradeOpen;
  const detail = !inAuction && !compose ? incoming.find((t) => !hidden[t.id]) : undefined;
  const back = () => (compose ? useGame.setState({ tradeOpen: false }) : detail && setHidden(detail.id, true));

  return (
    <Panel ring={compose || detail ? "ring-2 ring-success/50" : undefined}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {compose || detail ? (
            <Button size="icon-xs" variant="ghost" aria-label={tr("trade.back")} onClick={back}>
              <ArrowLeft className="size-3.5" />
            </Button>
          ) : (
            <Handshake className="size-3.5" />
          )}
          {compose ? tr("trade.propose") : detail ? tr("trade.incoming", { name: names[detail.from] }) : tr("trade.title")}
        </span>
        {!compose && !detail && (
          <Button size="xs" disabled={inAuction || !me || me.bankrupt} onClick={() => useGame.setState({ tradeOpen: true })}>
            <Plus className="size-3.5" />
            {tr("trade.create")}
          </Button>
        )}
      </div>

      <div key={compose ? "compose" : (detail?.id ?? "list")} className="space-y-2 duration-300 animate-in fade-in slide-in-from-top-1">
        {compose ? (
          <TradeComposer game={game} myId={myId} />
        ) : detail ? (
          <>
            <div className="h-1.5 rounded-full bg-success/50" />
            <div className="space-y-2 text-sm">
              <div className="space-y-1">
                <div className="text-2xs font-semibold tracking-wide uppercase text-success">{tr("trade.youGet")}</div>
                <BundleChips b={detail.give} />
              </div>
              <div className="space-y-1">
                <div className="text-2xs font-semibold tracking-wide uppercase text-destructive">{tr("trade.youGive")}</div>
                <BundleChips b={detail.get} />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1" onClick={() => send({ type: "respondTrade", id: detail.id, accept: true })}>
                {tr("trade.accept")}
              </Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => send({ type: "respondTrade", id: detail.id, accept: false })}>
                {tr("trade.reject")}
              </Button>
            </div>
          </>
        ) : (
          <>
            {incoming.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {tr("trade.incomingRow", { name: names[t.from] })}
                <Button size="xs" variant="ghost" disabled={inAuction} onClick={() => setHidden(t.id, false)}>
                  {tr("trade.show")}
                </Button>
              </div>
            ))}
            {outgoing.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {tr("trade.waiting", { name: names[t.to] })}
                <Button size="xs" variant="ghost" onClick={() => send({ type: "cancelTrade", id: t.id })}>
                  {tr("trade.cancel")}
                </Button>
              </div>
            ))}
          </>
        )}
      </div>
    </Panel>
  );
}

// right-hand column: players + bankrupt, trades, properties
export function GamePanels({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const t = useT();
  const me = game.players.find((p) => p.id === myId);
  const inAuction = game.stack.some((f) => f.t === "auction");
  // voluntary bankruptcy is legal anytime (engine blocks it mid-auction)
  const canBankrupt = game.status === "playing" && !!me && !me.bankrupt && !inAuction;
  return (
    <div className="flex w-full flex-col gap-2">
      <Panel>
        <PlayerList game={game} />
      </Panel>
      {/* asta: desktop tra giocatori e scambi; mobile in cima, subito sotto la board (order-first) */}
      <AuctionPanel game={game} />
      <TradePanel game={game} myId={myId} />
      <AssetsPanel game={game} myId={myId} />
      {/* staccata da tutto: è l'azione più distruttiva del gioco */}
      {/* stessa dignità di roster, scambi e proprietà: è un pannello, non un chip */}
      {canBankrupt && (
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{t("debt.bankruptHint")}</span>
            <Button
              size="sm"
              variant="destructive"
              className="shrink-0 pointer-coarse:min-h-11"
              onClick={() => confirm(t("debt.confirmBankrupt")) && send({ type: "bankrupt" })}
            >
              {t("debt.bankrupt")}
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
