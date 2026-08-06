import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { MAX_NAME, TOKENS } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOKEN_COLOR, TOKEN_NAME } from "@/lib/colors";
import { useGame } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { send } from "@/lib/ws";

// La tua identità prima della partita: nome e inchiostro. Il vincolo di unicità è
// del motore; qui lo si vede PRIMA di premere, non dopo il rifiuto.
export function Identita({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const t = useT();
  const me = game.players.find((p) => p.id === myId);
  const [bozza, setBozza] = useState(me?.name ?? "");
  const [tocco, setTocco] = useState(false); // validiamo dopo il blur, non a ogni tasto
  const input = useRef<HTMLInputElement>(null);

  // il server può rinominarti all'ingresso (nome già preso): allinea la bozza
  useEffect(() => {
    if (me && document.activeElement !== input.current) setBozza(me.name);
  }, [me?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return null;

  const nome = bozza.trim();
  const presoDaAltri = game.players.some((p) => p.id !== myId && p.name.trim().toLowerCase() === nome.toLowerCase());
  const errore = !nome ? t("id.nameEmpty") : presoDaAltri ? t("id.nameTaken") : null;
  const cambiato = nome !== me.name;
  const salva = () => {
    if (errore || !cambiato) return;
    send({ type: "profile", name: nome });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <label className="block font-condensed text-micro tracking-widest text-muted-foreground uppercase" htmlFor="mio-nome">
          {t("id.name")}
        </label>
        <div className="flex gap-2">
          <Input
            id="mio-nome"
            ref={input}
            value={bozza}
            maxLength={MAX_NAME}
            aria-invalid={tocco && !!errore}
            aria-describedby={tocco && errore ? "errore-nome" : undefined}
            onChange={(e) => setBozza(e.target.value)}
            onBlur={() => {
              setTocco(true);
              salva();
            }}
            onKeyDown={(e) => e.key === "Enter" && (setTocco(true), salva(), input.current?.blur())}
          />
          <Button size="lg" variant="secondary" className="shrink-0" disabled={!!errore || !cambiato} onClick={salva}>
            <Pencil className="size-3.5" />
            {t("id.rename")}
          </Button>
        </div>
        {/* l'errore sta sotto al campo che lo causa, e viene annunciato */}
        {tocco && errore && (
          <p id="errore-nome" role="alert" className="text-xs text-destructive">
            {errore}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="font-condensed text-micro tracking-widest text-muted-foreground uppercase">{t("id.ink")}</legend>
        <div className="grid w-fit grid-cols-4 gap-2">
          {Array.from({ length: TOKENS }, (_, i) => {
            const altro = game.players.find((p) => p.id !== myId && p.token === i);
            const mio = me.token === i;
            return (
              <button
                key={i}
                type="button"
                disabled={!!altro}
                // 44px pieni: è un bersaglio tattile, non un pallino
                className={`relative flex size-11 items-center justify-center ring-1 ring-paper-ink/40 transition-transform disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${mio ? "ring-2 ring-ring" : "hover:scale-105"}`}
                style={{ background: TOKEN_COLOR[i] }}
                aria-pressed={mio}
                // mai il colore da solo: il nome dell'inchiostro sta nell'etichetta
                aria-label={altro ? t("id.inkTaken", { ink: TOKEN_NAME[i], name: altro.name }) : TOKEN_NAME[i]}
                title={altro ? t("id.inkTaken", { ink: TOKEN_NAME[i], name: altro.name }) : TOKEN_NAME[i]}
                onClick={() => send({ type: "profile", token: i })}
              >
                {mio && <Check className="size-5" style={{ color: "var(--color-paper-ink)" }} />}
                {altro && (
                  <span className="font-mono text-micro" style={{ color: "var(--color-paper-ink)" }}>
                    {altro.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="pt-1 text-2xs text-muted-foreground">{t("id.inkHint", { ink: TOKEN_NAME[me.token % TOKENS] })}</p>
      </fieldset>
    </div>
  );
}
