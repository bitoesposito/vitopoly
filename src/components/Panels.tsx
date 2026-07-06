import { useState } from "react";
import { BOARD } from "@vitopoly/game";
import type { AuctionFrame, DebtFrame, PublicState } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTileName } from "@/lib/i18n";
import { send } from "@/lib/ws";

// Compact game panels. Card size="sm"; status colors via --color-success/--color-warning tokens.
function Panel({ ring, className, children }: { ring?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card size="sm" className={ring}>
      <CardContent className={`space-y-2 ${className ?? ""}`}>{children}</CardContent>
    </Card>
  );
}

export function BuyPanel({ game, myId }: { game: PublicState; myId: string }) {
  const t = useT();
  const tn = useTileName();
  const ph = game.phase;
  if (ph.t !== "buyPrompt" || game.stack.length > 0) return null;
  if (game.players[game.current]?.id !== myId) return null;
  const tile = BOARD[ph.tile];
  return (
    <Panel ring="ring-primary/50">
      <div className="text-sm font-semibold">
        {t("buy.q", { name: tn(ph.tile) })} <span className="text-success">${tile.price}</span>?
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => send({ type: "buy" })}>
          {t("buy.buy")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => send({ type: "decline" })}>
          {game.settings.auction ? t("buy.declineAuction") : t("buy.decline")}
        </Button>
      </div>
    </Panel>
  );
}

export function AuctionPanel({ game, myId }: { game: PublicState; myId: string }) {
  const t = useT();
  const tn = useTileName();
  const [amount, setAmount] = useState("");
  const f = game.stack.at(-1);
  if (f?.t !== "auction") return null;
  const a = f as AuctionFrame;
  const inAuction = a.active.includes(myId);
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  return (
    <Panel ring="ring-warning/50">
      <div className="text-sm font-semibold text-warning">{t("auction.title", { name: tn(a.tile) })}</div>
      <div className="text-muted-foreground">
        {t("auction.offer")} <b className="text-warning">${a.bid}</b> {a.leader ? t("auction.by", { name: names[a.leader] }) : t("auction.none")} · {t("auction.inRace")}{" "}
        {a.active.map((x) => names[x]).join(", ")}
      </div>
      {inAuction && (
        <div className="flex gap-2">
          <Input className="h-7 w-20" type="number" placeholder={`> ${a.bid}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button size="sm" onClick={() => send({ type: "bid", amount: Number(amount) })}>
            {t("auction.bid")}
          </Button>
          <Button size="sm" variant="secondary" disabled={a.leader === myId} onClick={() => send({ type: "fold" })}>
            {t("auction.fold")}
          </Button>
        </div>
      )}
    </Panel>
  );
}

export function DebtPanel({ game, myId }: { game: PublicState; myId: string }) {
  const t = useT();
  const f = game.stack.at(-1);
  if (f?.t !== "debt") return null;
  const d = f as DebtFrame;
  const total = d.claims.reduce((s, c) => s + c.amount, 0);
  const me = game.players.find((p) => p.id === myId);
  if (d.debtor !== myId)
    return <Panel>{t("debt.someone", { name: game.players.find((p) => p.id === d.debtor)?.name ?? "", total })}</Panel>;
  return (
    <Panel ring="ring-destructive/50">
      <div className="text-sm font-semibold text-destructive">{t("debt.youOwe", { total })}</div>
      <div className="text-muted-foreground">{t("debt.help")}</div>
      <div className="flex gap-2">
        <Button size="sm" disabled={(me?.cash ?? 0) < d.claims[0].amount} onClick={() => send({ type: "payDebt" })}>
          {t("debt.pay")}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => send({ type: "bankrupt" })}>
          {t("debt.bankrupt")}
        </Button>
      </div>
    </Panel>
  );
}

// My properties: build/sell/mortgage. Active in postRoll (my turn) and in my debt frame.
export function AssetsPanel({ game, myId }: { game: PublicState; myId: string }) {
  const t = useT();
  const tn = useTileName();
  const [open, setOpen] = useState(false);
  const node = game.stack.at(-1) ?? game.phase;
  const mine = Object.entries(game.props).filter(([, o]) => o!.owner === myId);
  if (mine.length === 0) return null;
  const inMyDebt = node.t === "debt" && (node as DebtFrame).debtor === myId;
  const canManage = (node.t === "postRoll" && game.players[game.current]?.id === myId) || inMyDebt;
  const canBuild = node.t === "postRoll" && game.players[game.current]?.id === myId;

  return (
    <Panel>
      <button className="flex w-full items-center justify-between font-semibold" onClick={() => setOpen(!open)}>
        <span>{t("assets.title", { n: mine.length })}</span>
        <span>{open || inMyDebt ? "▾" : "▸"}</span>
      </button>
      {(open || inMyDebt) && (
        <div className="space-y-1.5">
          {mine.map(([k, o]) => {
            const tileId = Number(k);
            const def = BOARD[tileId];
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate">
                  {tn(tileId)} {o!.mortgaged ? <span className="text-destructive">(M)</span> : o!.houses === 5 ? "🏨" : "🏠".repeat(o!.houses)}
                </span>
                {canManage && (
                  <span className="flex shrink-0 gap-1">
                    {canBuild && def.kind === "street" && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "build", tile: tileId })}>
                        +🏠${def.houseCost}
                      </Button>
                    )}
                    {o!.houses > 0 && (
                      <Button size="xs" variant="secondary" onClick={() => send({ type: "sellHouse", tile: tileId })}>
                        −🏠
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
      )}
    </Panel>
  );
}

export function TradePanel({ game, myId }: { game: PublicState; myId: string }) {
  const tr = useT(); // `t` è già usato come var trade/tile nei loop sotto
  const tn = useTileName();
  const [to, setTo] = useState("");
  const [giveCash, setGiveCash] = useState("0");
  const [getCash, setGetCash] = useState("0");
  const [giveProps, setGiveProps] = useState<number[]>([]);
  const [getProps, setGetProps] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  if (game.stack.some((f) => f.t === "auction")) return null;

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
      {!open ? (
        <Button size="xs" variant="secondary" onClick={() => setOpen(true)}>
          {tr("trade.propose")}
        </Button>
      ) : (
        <div className="space-y-2">
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
          <div className="flex gap-1.5">
            <Button
              size="xs"
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
            <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
              {tr("trade.close")}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
