import { useState } from "react";
import { euro } from "@/lib/format";

// Il denaro è l'unico punteggio di un gioco senza audio: la cifra rientra a ogni cambio e,
// dove c'è spazio sopra (`delta`), la differenza sale e svanisce. Nessun conteggio
// incrementale: è un numero che si legge per decidere se comprare, e un tween mostrerebbe
// mezzo secondo di cifra falsa.
export function Cash({ value, delta, className }: { value: number; delta?: boolean; className?: string }) {
  // stato aggiustato in render: React ridisegna prima di dipingere, senza un effetto
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
          className={`cifra-delta pointer-events-none absolute -top-3 right-0 font-mono text-2xs whitespace-nowrap ${
            diff > 0 ? "text-success" : "text-destructive"
          }`}
        >
          {diff > 0 ? "+" : "−"}
          {euro(Math.abs(diff))}
        </span>
      )}
    </span>
  );
}
