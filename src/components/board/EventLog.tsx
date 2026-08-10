import { CHANCE, CHEST } from "@tangentopoly/game";
import type { GameEvent, PublicState } from "@tangentopoly/game";
import { translate, tileName, type MsgKey } from "@/lib/i18n";
import { playerNames } from "@/lib/selectors";
import { euro } from "@/lib/format";
import { useGame } from "@/lib/store";
import { TOKEN_COLOR } from "@/lib/palette";

// Dado, spostamenti e pagamenti d'asta NON finiscono nel log: li raccontano già dadi,
// pedine e pannello asta. Tutto il resto diventa una riga di prosa.

function line(e: GameEvent, names: Record<string, string>, myId: string): string | null {
  const t = translate;
  switch (e.e) {
    case "rolled":
    case "moved":
      return null;
    case "paid": {
      const who = (x: string) => (x === "bank" ? t("ev.bank") : names[x]);
      const w = e.why;
      if (w === "auction") return null; // già coperto da auctionWon
      if (w === "GO salary") return t("ev.goSalary", { name: who(e.to), amount: euro(e.amount) });
      if (w === "bail") return t("ev.bail", { name: who(e.from), amount: euro(e.amount) });
      if (w === "tax") return t("ev.tax", { name: who(e.from), amount: euro(e.amount) });
      if (w === "vacation cash") return t("ev.vacation", { name: who(e.to), amount: euro(e.amount) });
      if (w.startsWith("buy ")) return t("ev.bought", { name: who(e.from), tile: w.slice(4) }); // why porta già il nome italiano
      return t("ev.paid", { from: who(e.from), to: who(e.to), amount: euro(e.amount) });
    }
    case "asset": {
      const key: MsgKey =
        e.what === "build"
          ? e.hotel
            ? "ev.buildHotel"
            : "ev.build"
          : e.what === "sellHouse"
            ? e.hotel
              ? "ev.sellHotel"
              : "ev.sellHouse"
            : (`ev.${e.what}` as const); // mortgage | unmortgage | sellProperty
      return t(key, { name: names[e.pid], tile: tileName(e.tile), amount: euro(e.amount) });
    }
    case "auctionWon":
      return t("ev.auctionWon", { name: names[e.pid], tile: tileName(e.tile), price: euro(e.price) });
    case "jailed":
      return e.pid === myId ? t("ev.jailedYou") : t("ev.jailed", { name: names[e.pid] });
    case "bankrupt":
      return t("ev.bankrupt", { name: names[e.pid] });
    case "card":
      return t("ev.card", { name: names[e.pid], text: (e.deck === "chance" ? CHANCE : CHEST)[e.cardId].text });
    case "traded":
      return t("ev.traded", { a: names[e.from], b: names[e.to] });
    case "info":
      return e.text;
  }
}

// Il più recente in alto. Porta anche la chat: chiusa in un foglio sotto la piega nessuno
// si accorgeva che qualcuno stava scrivendo. Un messaggio si distingue per il segno
// d'inchiostro del mittente, mai per il colore del testo (sotto il contrasto minimo).
export function EventLog({ game, myId }: { game: PublicState; myId: string }) {
  const feed = useGame((s) => s.feed);
  const names = playerNames(game);
  const token = (pid: string) => game.players.find((p) => p.id === pid)?.token ?? 0;

  type Row = { key: number; text: string; from: string | null; ink: string | null };
  const rows = feed
    .flatMap<Row>((f) => {
      if ("msg" in f) return [{ key: f.seq, text: f.msg.text, from: f.msg.name, ink: TOKEN_COLOR[token(f.msg.pid) % 8] }];
      const text = line(f.ev, names, myId);
      return text ? [{ key: f.seq, text, from: null, ink: null }] : [];
    })
    .slice(-30)
    .reverse();

  return (
    <div className="min-h-16 w-full flex-1 basis-0 overflow-y-auto rounded-md p-2 text-2xs leading-relaxed text-muted-foreground sm:text-xs lg:text-sm">
      <div className="flex flex-col text-center">
        {rows.map(({ key, text, from, ink }, j) => (
          <div
            key={key}
            // solo le righe nuove si montano, quindi solo loro entrano
            className={`animate-in duration-200 ease-out fade-in slide-in-from-top-1 ${j === 0 ? "font-semibold text-foreground" : ""} ${
              ink ? "flex items-center justify-center gap-1.5" : ""
            }`}
          >
            {ink && <span className="h-3 w-1 shrink-0" style={{ background: ink }} aria-hidden />}
            {from && <b className="text-foreground">{from}</b>}
            <span className={ink ? "min-w-0 text-foreground" : ""}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
