import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Conferma a due tempi al posto di `confirm()`: il primo tocco arma, il secondo esegue,
// e dopo qualche secondo si disarma da solo. Il dialogo nativo in certe webview in-app
// viene soppresso e ritorna `false`, quindi l'azione non partiva e nessuno capiva perché.
// Qui la conferma è nel documento: non può essere soppressa e si può stilare.

const ARMED_MS = 4000;

export function ConfirmButton({
  label,
  armedLabel,
  armedAriaLabel,
  onConfirm,
  ...rest
}: {
  label: React.ReactNode;
  /** cosa mostra da armato: deve dire chiaramente che il prossimo tocco è quello vero */
  armedLabel: React.ReactNode;
  /** obbligatorio quando `armedLabel` è una sola icona: senza, da armato il bottone
   *  resterebbe senza nome per chi usa un lettore di schermo */
  armedAriaLabel?: string;
  onConfirm: () => void;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "children">) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <Button
      {...rest}
      // da armato il bottone cambia mestiere: il lettore di schermo lo deve sentire
      aria-label={armed ? (armedAriaLabel ?? rest["aria-label"]) : rest["aria-label"]}
      title={armed ? (armedAriaLabel ?? rest.title) : rest.title}
      variant={armed ? "destructive" : rest.variant}
      className={`${rest.className ?? ""} ${armed ? "animate-pulse" : ""}`}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? armedLabel : label}
    </Button>
  );
}
