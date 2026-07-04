import { useState } from "react";
import { BOARD } from "@vitopoly/game";
import type { AuctionFrame, DebtFrame, PublicState } from "@vitopoly/game";
import { Button } from "@/components/ui/button";
import { send } from "@/lib/ws";

const card = "rounded-md border border-white/10 bg-white/5 p-2.5 text-xs space-y-2";
const inputCls =
  "h-7 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400";

export function BuyPanel({ game, myId }: { game: PublicState; myId: string }) {
  const ph = game.phase;
  if (ph.t !== "buyPrompt" || game.stack.length > 0) return null;
  if (game.players[game.current]?.id !== myId) return null;
  const tile = BOARD[ph.tile];
  return (
    <div className={`${card} border-indigo-400/40`}>
      <div className="text-sm font-semibold">
        Comprare {tile.name} per <span className="text-emerald-300">${tile.price}</span>?
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-md" onClick={() => send({ type: "buy" })}>
          Compra
        </Button>
        <Button size="sm" variant="secondary" className="rounded-md" onClick={() => send({ type: "decline" })}>
          {game.settings.auction ? "Rifiuta (asta)" : "Rifiuta"}
        </Button>
      </div>
    </div>
  );
}

export function AuctionPanel({ game, myId }: { game: PublicState; myId: string }) {
  const [amount, setAmount] = useState("");
  const f = game.stack.at(-1);
  if (f?.t !== "auction") return null;
  const a = f as AuctionFrame;
  const inAuction = a.active.includes(myId);
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.name]));
  return (
    <div className={`${card} border-amber-400/50`}>
      <div className="text-sm font-semibold text-amber-300">🔨 Asta: {BOARD[a.tile].name}</div>
      <div className="text-slate-300">
        offerta <b className="text-amber-200">${a.bid}</b> {a.leader ? `di ${names[a.leader]}` : "(nessuna)"} · in gara:{" "}
        {a.active.map((x) => names[x]).join(", ")}
      </div>
      {inAuction && (
        <div className="flex gap-2">
          <input className={`${inputCls} w-20`} type="number" placeholder={`> ${a.bid}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button size="sm" className="rounded-md" onClick={() => send({ type: "bid", amount: Number(amount) })}>
            Offri
          </Button>
          <Button size="sm" variant="secondary" className="rounded-md" disabled={a.leader === myId} onClick={() => send({ type: "fold" })}>
            Passa
          </Button>
        </div>
      )}
    </div>
  );
}

export function DebtPanel({ game, myId }: { game: PublicState; myId: string }) {
  const f = game.stack.at(-1);
  if (f?.t !== "debt") return null;
  const d = f as DebtFrame;
  const total = d.claims.reduce((s, c) => s + c.amount, 0);
  const me = game.players.find((p) => p.id === myId);
  if (d.debtor !== myId)
    return <div className={card}>{game.players.find((p) => p.id === d.debtor)?.name} sta risolvendo un debito da ${total}…</div>;
  return (
    <div className={`${card} border-rose-500/50`}>
      <div className="text-sm font-semibold text-rose-300">Devi ${total}</div>
      <div className="text-slate-400">Vendi case / ipoteca qui sotto per raccogliere contanti, poi paga — o dichiara bancarotta.</div>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-md" disabled={(me?.cash ?? 0) < d.claims[0].amount} onClick={() => send({ type: "payDebt" })}>
          Paga
        </Button>
        <Button size="sm" variant="destructive" className="rounded-md" onClick={() => send({ type: "bankrupt" })}>
          Bancarotta
        </Button>
      </div>
    </div>
  );
}

// My properties: build/sell/mortgage. Active in postRoll (my turn) and in my debt frame.
export function AssetsPanel({ game, myId }: { game: PublicState; myId: string }) {
  const [open, setOpen] = useState(false);
  const node = game.stack.at(-1) ?? game.phase;
  const mine = Object.entries(game.props).filter(([, o]) => o!.owner === myId);
  if (mine.length === 0) return null;
  const inMyDebt = node.t === "debt" && (node as DebtFrame).debtor === myId;
  const canManage = (node.t === "postRoll" && game.players[game.current]?.id === myId) || inMyDebt;
  const canBuild = node.t === "postRoll" && game.players[game.current]?.id === myId;

  return (
    <div className={card}>
      <button className="flex w-full items-center justify-between font-semibold" onClick={() => setOpen(!open)}>
        <span>🏘 Le tue proprietà ({mine.length})</span>
        <span>{open || inMyDebt ? "▾" : "▸"}</span>
      </button>
      {(open || inMyDebt) && (
        <div className="space-y-1.5">
          {mine.map(([k, o]) => {
            const t = Number(k);
            const def = BOARD[t];
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate">
                  {def.name} {o!.mortgaged ? <span className="text-rose-400">(M)</span> : o!.houses === 5 ? "🏨" : "🏠".repeat(o!.houses)}
                </span>
                {canManage && (
                  <span className="flex shrink-0 gap-1">
                    {canBuild && def.kind === "street" && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" className="rounded" onClick={() => send({ type: "build", tile: t })}>
                        +🏠${def.houseCost}
                      </Button>
                    )}
                    {o!.houses > 0 && (
                      <Button size="xs" variant="secondary" className="rounded" onClick={() => send({ type: "sellHouse", tile: t })}>
                        −🏠
                      </Button>
                    )}
                    {game.settings.mortgageAllowed && o!.houses === 0 && !o!.mortgaged && (
                      <Button size="xs" variant="secondary" className="rounded" onClick={() => send({ type: "mortgage", tile: t })}>
                        Ipoteca +${def.price! / 2}
                      </Button>
                    )}
                    {canBuild && o!.mortgaged && (
                      <Button size="xs" variant="secondary" className="rounded" onClick={() => send({ type: "unmortgage", tile: t })}>
                        Riscatta ${Math.ceil((def.price! / 2) * 1.1)}
                      </Button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TradePanel({ game, myId }: { game: PublicState; myId: string }) {
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
    [b.cash > 0 ? `$${b.cash}` : null, ...b.props.map((x) => BOARD[x].name)].filter(Boolean).join(" + ") || "niente";

  return (
    <div className={card}>
      {incoming.map((t) => (
        <div key={t.id} className="space-y-1.5 rounded-md border border-emerald-400/40 bg-emerald-400/5 p-2">
          <div>
            <b style={{ color: "#6ee7b7" }}>{names[t.from]}</b> offre <b>{bundleText(t.give)}</b> in cambio di <b>{bundleText(t.get)}</b>
          </div>
          <div className="flex gap-1.5">
            <Button size="xs" className="rounded" onClick={() => send({ type: "respondTrade", id: t.id, accept: true })}>
              Accetta
            </Button>
            <Button size="xs" variant="secondary" className="rounded" onClick={() => send({ type: "respondTrade", id: t.id, accept: false })}>
              Rifiuta
            </Button>
          </div>
        </div>
      ))}
      {outgoing.map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-slate-400">
          scambio con {names[t.to]} in attesa…
          <Button size="xs" variant="ghost" className="rounded" onClick={() => send({ type: "cancelTrade", id: t.id })}>
            Annulla
          </Button>
        </div>
      ))}
      {!open ? (
        <Button size="xs" variant="secondary" className="rounded" onClick={() => setOpen(true)}>
          🤝 Proponi scambio
        </Button>
      ) : (
        <div className="space-y-2">
          <select className={`${inputCls} w-full`} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">— scegli giocatore —</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="space-y-1">
            <div className="text-slate-400">Tu dai:</div>
            <input className={`${inputCls} w-24`} type="number" value={giveCash} onChange={(e) => setGiveCash(e.target.value)} /> $
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {propsOf(myId).map((t) => (
                <label key={t} className="flex items-center gap-1">
                  <input type="checkbox" className="accent-indigo-500" checked={giveProps.includes(t)} onChange={() => toggle(giveProps, setGiveProps, t)} />
                  {BOARD[t].name}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-400">Tu ricevi:</div>
            <input className={`${inputCls} w-24`} type="number" value={getCash} onChange={(e) => setGetCash(e.target.value)} /> $
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {to &&
                propsOf(to).map((t) => (
                  <label key={t} className="flex items-center gap-1">
                    <input type="checkbox" className="accent-indigo-500" checked={getProps.includes(t)} onChange={() => toggle(getProps, setGetProps, t)} />
                    {BOARD[t].name}
                  </label>
                ))}
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="xs"
              className="rounded"
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
              Invia
            </Button>
            <Button size="xs" variant="ghost" className="rounded" onClick={() => setOpen(false)}>
              Chiudi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
