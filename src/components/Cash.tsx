import { useState } from "react";
import { euro } from "@/lib/format";

// Senza audio il denaro è l'unico punteggio, e cambiava in silenzio: affitti, stipendi e
// tasse sostituivano la cifra come se fosse sempre stata quella. Ora la cifra rientra a
// ogni cambio, e dove c'è spazio (`delta`) la differenza sale e svanisce.
// Nessun conteggio incrementale: è un numero che si legge per decidere se puoi comprare,
// e animarlo significherebbe mostrare per mezzo secondo una cifra falsa.
export function Cash({ value, delta, className }: { value: number; delta?: boolean; className?: string }) {
  // stato aggiustato in render, non una ref letta in render: la differenza è un valore
  // reattivo, e React ridisegna prima di dipingere senza passare da un effetto
  const [seen, setSeen] = useState(value);
  const [diff, setDiff] = useState(0);
  if (seen !== value) {
    setSeen(value);
    setDiff(value - seen);
  }

  return (
    <span className={`relative font-mono tabular-nums ${className ?? ""}`}>
      <span key={value} className="inline-block animate-in duration-200 zoom-in-95 fade-in">
        {euro(value)}
      </span>
      {delta && diff !== 0 && (
        <span
          key={`d${value}`}
          aria-hidden
          className={`cifra-delta pointer-events-none absolute -top-3 right-0 font-mono text-2xs ${diff > 0 ? "text-success" : "text-destructive"}`}
        >
          {diff > 0 ? "+" : "−"}
          {euro(Math.abs(diff))}
        </span>
      )}
    </span>
  );
}
