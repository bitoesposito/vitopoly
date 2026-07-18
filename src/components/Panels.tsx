import { useState } from "react";
import { ArrowLeft, Handshake, Hotel, House, Minus, Plus, Ticket } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { Bundle, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { useGame } from "@/lib/store";
import { GROUP_COLOR } from "@/lib/colors";
import { PlayerList } from "./PlayerList";
import { AuctionPanel } from "./AuctionDialog";

// compact game panels
function Panel({ ring, className, children }: { ring?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className={ring}>
      <CardContent className={`space-y-2 ${className ?? ""}`}>{children}</CardContent>
    </Card>
  );
}

// my properties: sell/mortgage on my turn or my debt (cash raisers); build/unmortgage on my preRoll/postRoll
export function AssetsPanel({ game, myId }: { game: PublicState; myId: string }) {
  const t = useT();
  const tn = useTileName();
  const node = game.stack.at(-1) ?? game.phase;
  const mine = Object.entries(game.props).filter(([, o]) => o!.owner === myId);
  const myTurn = game.players[game.current]?.id === myId;
  const inMyDebt = game.stack.some((f) => f.t === "debt" && f.debtor === myId);
  const canRaise = game.status === "playing" && (myTurn || inMyDebt);
  const canBuild = (node.t === "preRoll" || node.t === "postRoll") && myTurn;

  return (
    <Panel>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <House className="size-3.5" />
        {t("assets.title", { n: mine.length })}
      </div>
      <div className="space-y-1.5">
          {mine.map(([k, o]) => {
            const tileId = Number(k);
            const def = BOARD[tileId];
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="flex min-w-0 flex-1 items-center gap-0.5 truncate">
                  {tn(tileId)}{" "}
                  {o!.mortgaged ? (
                    <span className="text-destructive">(M)</span>
                  ) : o!.houses === 5 ? (
                    <Hotel className="size-3.5" />
                  ) : (
                    Array.from({ length: o!.houses }, (_, h) => <House key={h} className="size-3.5" />)
                  )}
                </span>
                {(canRaise || canBuild) && (
                  <span className="flex shrink-0 gap-1">
                    {canBuild && def.kind === "street" && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "build", tile: tileId })}>
                        <Plus className="size-3.5" />
                        <House className="size-3.5" />${def.houseCost}
                      </Button>
                    )}
                    {canRaise && o!.houses > 0 && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "sellHouse", tile: tileId })}>
                        <Minus className="size-3.5" />
                        <House className="size-3.5" />
                      </Button>
                    )}
                    {canRaise && game.settings.mortgageAllowed && o!.houses === 0 && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "mortgage", tile: tileId })}>
                        {t("assets.mortgage", { amount: def.price! / 2 })}
                      </Button>
                    )}
                    {canRaise && o!.houses === 0 && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "sellProperty", tile: tileId })}>
                        {t("assets.sell", { amount: def.price! / 2 })}
                      </Button>
                    )}
                    {canBuild && o!.mortgaged && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "unmortgage", tile: tileId })}>
                        {t("assets.unmortgage", { amount: Math.ceil((def.price! / 2) * 1.1) })}
                      </Button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </Panel>
  );
}

// Vista "nuovo scambio" del pannello Scambi (header e freccia indietro nel pannello)
function TradeComposer({ game, myId }: { game: PublicState; myId: string }) {
  const tr = useT();
  const tn = useTileName();
  const close = () => useGame.setState({ tradeOpen: false });
  const [to, setTo] = useState("");
  const [giveCash, setGiveCash] = useState("0");
  const [getCash, setGetCash] = useState("0");
  const [giveProps, setGiveProps] = useState<number[]>([]);
  const [getProps, setGetProps] = useState<number[]>([]);

  const others = game.players.filter((p) => p.id !== myId && !p.bankrupt);
  const propsOf = (pid: string) => Object.entries(game.props).filter(([, o]) => o!.owner === pid).map(([k]) => Number(k));
  const toggle = (list: number[], setList: (v: number[]) => void, t: number) =>
    setList(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);

  return (
    <div className="space-y-2 text-sm">
      <Select value={to} onValueChange={setTo}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder={tr("trade.pickPlayer")} />
        </SelectTrigger>
        <SelectContent>
          {others.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="space-y-1">
        <div className="text-muted-foreground">{tr("trade.youGive")}</div>
        <Input className="inline-flex h-7 w-24" type="number" value={giveCash} onChange={(e) => setGiveCash(e.target.value)} /> $
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {propsOf(myId).map((t) => (
            <Label key={t} className="flex items-center gap-1.5 font-normal">
              <Checkbox checked={giveProps.includes(t)} onCheckedChange={() => toggle(giveProps, setGiveProps, t)} />
              {tn(t)}
            </Label>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-muted-foreground">{tr("trade.youGet")}</div>
        <Input className="inline-flex h-7 w-24" type="number" value={getCash} onChange={(e) => setGetCash(e.target.value)} /> $
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {to &&
            propsOf(to).map((t) => (
              <Label key={t} className="flex items-center gap-1.5 font-normal">
                <Checkbox checked={getProps.includes(t)} onCheckedChange={() => toggle(getProps, setGetProps, t)} />
                {tn(t)}
              </Label>
            ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!to}
          onClick={() => {
            send({
              type: "proposeTrade",
              to,
              give: { cash: Number(giveCash) || 0, props: giveProps, jailCards: 0 },
              get: { cash: Number(getCash) || 0, props: getProps, jailCards: 0 },
            });
            close();
          }}
        >
          {tr("trade.send")}
        </Button>
      </div>
    </div>
  );
}

// una parte dell'offerta come chips: cash, atti (pallino colore gruppo), carte prigione
function BundleChips({ b }: { b: Bundle }) {
  const tr = useT();
  const tn = useTileName();
  const chips: React.ReactNode[] = [];
  if (b.cash > 0) chips.push(<span key="$" className="font-semibold text-success">${b.cash}</span>);
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
  if (chips.length === 0) return <span className="text-xs text-muted-foreground">{tr("bundle.nothing")}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span key={i} className="flex items-center border border-border bg-muted px-1.5 py-0.5 text-xs">
          {c}
        </span>
      ))}
    </span>
  );
}

// Pannello Scambi unico e navigabile: lista <-> dettaglio proposta / nuovo scambio.
// La freccia in header torna alla lista; una proposta nuova apre da sola il dettaglio
// e resta listata (con "Mostra") finché non si conclude o viene rifiutata.
export function TradePanel({ game, myId }: { game: PublicState; myId: string }) {
  const tr = useT();
  const tradeOpen = useGame((s) => s.tradeOpen);
  const hidden = useGame((s) => s.tradeHidden);
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
            <div className="space-y-1.5 text-sm">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{tr("trade.youGet")}</div>
                <BundleChips b={detail.give} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{tr("trade.youGive")}</div>
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
              <div key={t.id} className="flex items-center gap-2 text-muted-foreground">
                {tr("trade.incomingRow", { name: names[t.from] })}
                <Button size="xs" variant="ghost" disabled={inAuction} onClick={() => setHidden(t.id, false)}>
                  {tr("trade.show")}
                </Button>
              </div>
            ))}
            {outgoing.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-muted-foreground">
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
        <div className="flex justify-end border-t border-border pt-2">
          <Button
            size="xs"
            variant="destructive"
            disabled={!canBankrupt}
            onClick={() => confirm(t("debt.confirmBankrupt")) && send({ type: "bankrupt" })}
          >
            {t("debt.bankrupt")}
          </Button>
        </div>
      </Panel>
      {/* asta tra giocatori e scambi */}
      <AuctionPanel game={game} />
      <TradePanel game={game} myId={myId} />
      <AssetsPanel game={game} myId={myId} />
    </div>
  );
}
