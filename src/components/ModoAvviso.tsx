import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translate as t } from "@/lib/i18n";
import { avvisa, MODI, modo, setModo } from "@/lib/avvisi";

// Un bersaglio solo, che gira sui modi: aggiungerne uno è una voce in MODI e la sua icona
// qui.
const ICONA = { suono: Volume2, muto: VolumeX };

export function ModoAvviso() {
  const [m, setM] = useState(modo);
  const Icona = ICONA[m];

  const gira = () => {
    const dopo = MODI[(MODI.indexOf(m) + 1) % MODI.length];
    setModo(dopo);
    setM(dopo);
    // il modo si prova da sé, e un tocco è la sola condizione in cui suono e motore partono
    if (dopo !== "muto") avvisa("tocco");
  };

  return (
    <Button size="icon" variant="ghost" aria-label={t("modo.aria", { modo: t(`modo.${m}`) })} title={t(`modo.${m}`)} onClick={gira}>
      <Icona />
    </Button>
  );
}
