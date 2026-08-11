import { useState } from "react";
import { Vibrate, VibrateOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translate as t } from "@/lib/i18n";
import { aptico, buzz, MODI, modo, setModo, TICK } from "@/lib/haptics";

// Un bersaglio solo, che gira sui modi disponibili: quando ci sarà l'audio basta la sua
// icona qui e la voce in MODI.
const ICONA = { vibrazione: Vibrate, silenzioso: VibrateOff };

export function ModoAvviso() {
  const [m, setM] = useState(modo);
  if (!aptico()) return null;

  const Icona = ICONA[m];
  const gira = () => {
    const dopo = MODI[(MODI.indexOf(m) + 1) % MODI.length];
    setModo(dopo);
    setM(dopo);
    // il modo si prova da sé, e un tocco è la sola condizione in cui il motore parte
    if (dopo === "vibrazione") buzz(TICK);
  };

  return (
    <Button size="icon" variant="ghost" aria-label={t("modo.aria", { modo: t(`modo.${m}`) })} title={t(`modo.${m}`)} onClick={gira}>
      <Icona />
    </Button>
  );
}
