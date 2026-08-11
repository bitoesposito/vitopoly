import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/lib/store";
import { translate as t } from "@/lib/i18n";
import { connect, createRoom } from "@/lib/net/client";
import { ultimaStanza } from "@/lib/seat";
import { Rules } from "@/components/lobby/Rules";

export function Lobby() {
  const savedName = useGame((s) => s.name);
  const error = useGame((s) => s.error); // e.g. "stanza piena" — show it, allow retry
  const [name, setName] = useState(savedName);
  const [codice, setCodice] = useState("");
  const [busy, setBusy] = useState(false);
  const room = new URLSearchParams(location.search).get("room"); // join via friend's link
  const stuck = busy && !error;
  // con ?room nell'indirizzo la stanza è quella del link: due porte confonderebbero
  const ultima = room ? null : ultimaStanza();

  const go = async () => {
    setBusy(true);
    connect(room ?? (await createRoom()), name.trim());
  };

  return (
    // @container: il logotipo si misura sulla COLONNA, non sul viewport (sotto)
    <div className="@container mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 p-5">
      <header className="space-y-2">
        <div className="border-y border-border py-3">
          {/* Riempie la colonna e non la sfora, per costruzione. Con un clamp sul viewport
              sforava di 14-17px da 1024px in su: il corpo cresceva col root (fino a 4rem) e
              la colonna cresceva con lo STESSO root, quindi il rapporto era fisso e l'errore
              non dipendeva dalla finestra. In cqw la misura viene dalla scatola che deve
              contenerlo: "TANGENTOPOLY" in condensed 700 tracking-tight è larga 6.70 volte il
              corpo nel caso peggiore, quindi 14.5cqw sta sempre dentro — ed è lo stesso corpo
              che dava 13vw sul telefono. */}
          <h1 className="font-condensed text-[14.5cqw] leading-[0.85] font-bold tracking-tight uppercase">
            Tangento<span className="text-warning">poly</span>
          </h1>
          <div className="mt-1.5 flex items-baseline justify-between font-mono text-micro tracking-widest text-muted-foreground uppercase">
            <span>{t("lobby.serie")}</span>
            <span>{room ? `N. ${room}` : t("lobby.newIssue")}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t("lobby.pitch")}</p>
      </header>

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
        {/* l'app installata apre qui: se una partita è in corso, la sua porta è questa */}
        {ultima && (
          <Button variant="outline" className="w-full" disabled={stuck} onClick={() => connect(ultima, name.trim() || "Giocatore")}>
            {t("lobby.reenter", { code: ultima })}
          </Button>
        )}
        {/* Il codice apre una stanza precisa, senza passare dal link di qualcun altro.
            Minuscolo: è la forma con cui vive nell'URL e nella chiave del segreto. */}
        <label className="block pt-1 font-condensed text-micro tracking-widest text-muted-foreground uppercase" htmlFor="codice">
          {t("lobby.withCode")}
        </label>
        <div className="flex gap-2">
          <Input
            id="codice"
            placeholder={t("lobby.code")}
            value={codice}
            maxLength={8}
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono tracking-widest"
            onChange={(e) => setCodice(e.target.value.trim().toLowerCase())}
            onKeyDown={(e) => e.key === "Enter" && codice && name.trim() && connect(codice, name.trim())}
          />
          <Button
            variant="outline"
            className="shrink-0"
            disabled={stuck || !codice || !name.trim()}
            onClick={() => connect(codice, name.trim())}
          >
            {t("lobby.codeEnter")}
          </Button>
        </div>
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
          <Rules />
        </div>
      </details>
    </div>
  );
}
