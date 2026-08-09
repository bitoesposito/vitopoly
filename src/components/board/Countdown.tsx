import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

// Quanto manca prima che il server agisca al posto tuo. Parte muto: finché non è
// scattato il primo tick non sappiamo l'ora del client, e un numero sbagliato è peggio
// di nessun numero.
export function Countdown({ deadline }: { deadline?: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!deadline || now === 0) return null;

  const left = Math.max(0, Math.round((deadline - now) / 1000));
  return (
    <span className={`ml-1 inline-flex items-center gap-0.5 font-mono tabular-nums ${left <= 10 ? "font-bold text-destructive" : "text-muted-foreground"}`}>
      <Clock className="size-3.5" /> {left}s
    </span>
  );
}
