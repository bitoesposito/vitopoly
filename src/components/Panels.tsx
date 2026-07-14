import { useState } from "react";
import { Handshake, Hotel, House, Minus, Plus } from "lucide-react";
import { BOARD } from "@tangentopoly/game";
import type { DebtFrame, PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";
import { useGame } from "@/lib/store";
import { PlayerList } from "./PlayerList";

// compact game panels
function Panel({ ring, className, children }: { ring?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className={ring}>
      <CardContent className={`space-y-2 ${className ?? ""}`}>{children}</CardContent>
    </Card>
  );
}

// my properties: sell/mortgage always legal (cash raisers); build/unmortgage only on my postRoll
export function AssetsPanel({ game, myId }: { game: PublicState; myId: string }) {
  const t = useT();
  const tn = useTileName();
  const node = game.stack.at(-1) ?? game.phase;
  const mine = Object.entries(game.props).filter(([, o]) => o!.owner === myId);
  const canManage = game.status === "playing";
  const canBuild = node.t === "postRoll" && game.players[game.current]?.id === myId;

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
                {canManage && (
                  <span className="flex shrink-0 gap-1">
                    {canBuild && def.kind === "street" && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "build", tile: tileId })}>
                        <Plus className="size-3.5" />
                        <House className="size-3.5" />${def.houseCost}
                      </Button>
                    )}
                    {o!.houses > 0 && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "sellHouse", tile: tileId })}>
                        <Minus className="size-3.5" />
                        <House className="size-3.5" />
                      </Button>
                    )}
                    {game.settings.mortgageAllowed && o!.houses === 0 && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "mortgage", tile: tileId })}>
                        {t("assets.mortgage", { amount: def.price! / 2 })}
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

export function TradePanel({ game, myId }: { game: PublicState; myId: string }) {
  const tr = useT(); // `t` is taken by trade/tile loop vars below
  const tn = useTileName();
  const [to, setTo] = useState("");
  const [giveCash, setGiveCash] = useState("0");
  const [getCash, setGetCash] = useState("0");
  const [giveProps, setGiveProps] = useState<number[]>([]);
  const [getProps, setGetProps] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  const inAuction = game.stack.some((f) => f.t === "auction"); // trading is blocked during auctions

  const others = game.players.filter((p) => p.id !== myId && !p.bankrupt);
  const incoming = game.trades.filter((t) => t.to === myId);
  const outgoing = game.trades.filter((t) => t.from === myId);
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  const propsOf = (pid: string) => Object.entries(game.props).filter(([, o]) => o!.owner === pid).map(([k]) => Number(k));
  const toggle = (list: number[], setList: (v: number[]) => void, t: number) =>
    setList(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);
  const bundleText = (b: { cash: number; props: number[] }) =>
    [b.cash > 0 ? `$${b.cash}` : null, ...b.props.map((x) => tn(x))].filter(Boolean).join(" + ") || tr("bundle.nothing");

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Handshake className="size-3.5" />
          {tr("trade.title")}
        </span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="xs" disabled={inAuction}>
              <Plus className="size-3.5" />
              {tr("trade.create")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                <Handshake className="size-3.5" />
                {tr("trade.propose")}
              </DialogTitle>
            </DialogHeader>
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
            </div>
            <DialogFooter>
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
                  setOpen(false);
                  setGiveProps([]);
                  setGetProps([]);
                  setGiveCash("0");
                  setGetCash("0");
                }}
              >
                {tr("trade.send")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {incoming.map((t) => (
        <div key={t.id} className="space-y-1.5 rounded-md border border-success/40 bg-success/5 p-2">
          <div>
            <b className="text-success">{names[t.from]}</b> {tr("trade.offers")} <b>{bundleText(t.give)}</b> {tr("trade.inExchange")} <b>{bundleText(t.get)}</b>
          </div>
          <div className="flex gap-1.5">
            <Button size="xs" onClick={() => send({ type: "respondTrade", id: t.id, accept: true })}>
              {tr("trade.accept")}
            </Button>
            <Button size="xs" variant="secondary" onClick={() => send({ type: "respondTrade", id: t.id, accept: false })}>
              {tr("trade.reject")}
            </Button>
          </div>
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
    </Panel>
  );
}

// right-hand column: players + bankrupt, trades, properties
export function GamePanels({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const t = useT();
  const node = game.stack.at(-1) ?? game.phase;
  const canBankrupt = node.t === "debt" && (node as DebtFrame).debtor === myId;
  return (
    <div className="flex w-full flex-col gap-2">
      <Panel>
        <PlayerList game={game} />
        <div className="flex justify-end border-t border-border pt-2">
          {/* bankrupt is only legal in your own debt frame; always visible, enabled only then */}
          <Button size="xs" variant="destructive" disabled={!canBankrupt} onClick={() => send({ type: "bankrupt" })}>
            {t("debt.bankrupt")}
          </Button>
        </div>
      </Panel>
      <TradePanel game={game} myId={myId} />
      <AssetsPanel game={game} myId={myId} />
    </div>
  );
}
