import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CHANCE, CHEST } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { connect, createRoom } from "@/lib/ws";
import { Regole } from "./Regole";

// Tre carte vere dai mazzi: dicono cos'è il gioco meglio di un sottotitolo.
// Indici fissi: la porta d'ingresso non cambia a ogni visita.
const VETRINA = [
  { deck: "chance" as const, text: CHANCE[10].text }, // "Il vigile vuole il caffè: paga €15"
  { deck: "chest" as const, text: CHEST[6].text }, // "Il conto a Lugano frutta: ritira €100"
  { deck: "chance" as const, text: CHANCE[14].text }, // "L'appalto truccato va in porto: ritira €150"
];

export function Lobby() {
  const savedName = useGame((s) => s.name);
  const error = useGame((s) => s.error); // e.g. "stanza piena" — show it, allow retry
  const t = useT();
  const [name, setName] = useState(savedName);
  const [busy, setBusy] = useState(false);
  const room = new URLSearchParams(location.search).get("room"); // join via friend's link
  const stuck = busy && !error;

  const go = async () => {
    setBusy(true);
    connect(room ?? (await createRoom()), name.trim());
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 p-5">
      <header className="space-y-2">
        <div className="campo-guilloche border-y border-border py-3">
          <h1 className="font-condensed text-[clamp(2.5rem,13vw,4rem)] leading-[0.85] font-bold tracking-tight uppercase">
            Tangento<span className="text-warning">poly</span>
          </h1>
          <div className="mt-1.5 flex items-baseline justify-between font-mono text-micro tracking-widest text-muted-foreground uppercase">
            <span>{t("lobby.serie")}</span>
            <span>{room ? `N. ${room}` : t("lobby.newIssue")}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t("lobby.pitch")}</p>
      </header>

      <ul className="space-y-1.5">
        {VETRINA.map((c) => (
          <li key={c.text} className="nota flex items-start gap-2 p-2">
            <span
              className="shrink-0 font-condensed text-micro tracking-widest uppercase"
              // inchiostri da carta: quelli su fondo scuro qui stanno sotto 4,5:1
              style={{ color: c.deck === "chance" ? "var(--sanguigna-carta)" : "var(--indaco-carta)" }}
            >
              {t(c.deck === "chance" ? "popup.chance" : "popup.chest")}
            </span>
            <span className="min-w-0 text-xs leading-snug">{c.text}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <label className="block font-condensed text-micro tracking-widest text-muted-foreground uppercase" htmlFor="nome">
          {room ? t("lobby.joining") : t("lobby.creating")}
        </label>
        <Input
          id="nome"
          autoFocus
          placeholder={t("lobby.name")}
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !stuck && name.trim() && go()}
        />
        <Button className="w-full" size="lg" disabled={stuck || !name.trim()} onClick={go}>
          {room ? t("lobby.enter") : t("lobby.create")}
        </Button>
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
        <p className="text-center text-2xs text-muted-foreground">{t("lobby.noAccount")}</p>
      </div>

      {/* è una variante: le regole stanno prima della partita */}
      <details className="group border-t border-border pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between font-condensed text-micro tracking-widest text-muted-foreground uppercase [&::-webkit-details-marker]:hidden">
          {t("rules.title")}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-3">
          <Regole />
        </div>
      </details>
    </div>
  );
}
