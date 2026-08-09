import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { MAX_NAME, TOKENS } from "@tangentopoly/game";
import type { PublicState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOKEN_COLOR, TOKEN_NAME } from "@/lib/palette";
import { useGame } from "@/lib/store";
import { translate as t } from "@/lib/i18n";
import { send } from "@/lib/net/client";

// Nome e inchiostro. Il vincolo di unicità è del motore: qui lo si vede prima di premere.
export function Identity({ game }: { game: PublicState }) {
  const myId = useGame((s) => s.myId);
  const me = game.players.find((p) => p.id === myId);
  const [draft, setDraft] = useState(me?.name ?? "");
  const [touched, setTouched] = useState(false); // validiamo dopo il blur, non a ogni tasto
  const input = useRef<HTMLInputElement>(null);

  // il server può rinominarti all'ingresso (name già preso): allinea la draft
  useEffect(() => {
    if (me && document.activeElement !== input.current) setDraft(me.name);
  }, [me?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return null;

  const name = draft.trim();
  const takenByOther = game.players.some((p) => p.id !== myId && p.name.trim().toLowerCase() === name.toLowerCase());
  const error = !name ? t("id.nameEmpty") : takenByOther ? t("id.nameTaken") : null;
  const changed = name !== me.name;
  const save = () => {
    if (error || !changed) return;
    send({ type: "profile", name: name });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <label className="block font-condensed text-micro tracking-widest text-muted-foreground uppercase" htmlFor="my-name">
          {t("id.name")}
        </label>
        <div className="flex gap-2">
          <Input
            id="my-name"
            ref={input}
            value={draft}
            maxLength={MAX_NAME}
            aria-invalid={touched && !!error}
            aria-describedby={touched && error ? "name-error" : undefined}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setTouched(true);
              save();
            }}
            onKeyDown={(e) => e.key === "Enter" && (setTouched(true), save(), input.current?.blur())}
          />
          <Button size="lg" variant="secondary" className="shrink-0" disabled={!!error || !changed} onClick={save}>
            <Pencil className="size-3.5" />
            {t("id.rename")}
          </Button>
        </div>
        {/* l'error sta sotto al campo che lo causa, e viene annunciato */}
        {touched && error && (
          <p id="name-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="font-condensed text-micro tracking-widest text-muted-foreground uppercase">{t("id.ink")}</legend>
        {/* riempie la riga: 4 chip larghe sul telefono, 8 in linea da sm. Altezza
            fissa a 44px invece di aspect-square, che su mobile faceva blocchi da 100px. */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Array.from({ length: TOKENS }, (_, i) => {
            const other = game.players.find((p) => p.id !== myId && p.token === i);
            const mine = me.token === i;
            return (
              <button
                key={i}
                type="button"
                disabled={!!other}
                // 44px pieni: è un bersaglio tattile, non un pallino
                className={`relative flex h-11 w-full items-center justify-center ring-1 ring-paper-ink/40 transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 ${mine ? "ring-2 ring-ring" : "enabled:hover:scale-105"}`}
                style={{ background: TOKEN_COLOR[i] }}
                aria-pressed={mine}
                // mai il colore da solo: il name dell'inchiostro sta nell'etichetta
                aria-label={other ? t("id.inkTaken", { ink: TOKEN_NAME[i], name: other.name }) : TOKEN_NAME[i]}
                title={other ? t("id.inkTaken", { ink: TOKEN_NAME[i], name: other.name }) : TOKEN_NAME[i]}
                onClick={() => send({ type: "profile", token: i })}
              >
                {/* preso = spento e basta. Le iniziali sopra al colore si leggevano
                    come il NOME del colore, non come "è di qualcun other". */}
                {mine && <Check className="size-5" style={{ color: "var(--color-paper-ink)" }} />}
              </button>
            );
          })}
        </div>
        <p className="pt-1 text-2xs text-muted-foreground">{t("id.inkHint", { ink: TOKEN_NAME[me.token % TOKENS] })}</p>
      </fieldset>
    </div>
  );
}
