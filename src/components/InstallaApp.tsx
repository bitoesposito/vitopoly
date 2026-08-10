import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translate as t } from "@/lib/i18n";

// L'invito a installare, e sta in UN posto solo: la sala d'attesa, l'unico momento in cui si
// è fermi ad aspettare gli altri. Non al caricamento (chi arriva da un link vuole entrare, non
// decidere) e mai durante un turno. Se l'app è già installata, o il dispositivo non sa
// installarla, questa riga non esiste — niente da chiudere, niente da ignorare.
type Invito = Event & { prompt: () => Promise<void> };

const giaInstallata = () => matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export function InstallaApp() {
  const [invito, setInvito] = useState<Invito | null>(null);
  const [dentro, setDentro] = useState(giaInstallata);

  useEffect(() => {
    // Il browser manda questo evento SOLO dove l'installazione è davvero possibile: è il
    // rilevatore, e non serve indovinare niente. preventDefault perché altrimenti mostra
    // anche la sua barra, e gli inviti diventano due.
    const arriva = (e: Event) => {
      e.preventDefault();
      setInvito(e as Invito);
    };
    const fatta = () => setDentro(true);
    addEventListener("beforeinstallprompt", arriva);
    addEventListener("appinstalled", fatta);
    return () => {
      removeEventListener("beforeinstallprompt", arriva);
      removeEventListener("appinstalled", fatta);
    };
  }, []);

  if (dentro) return null;
  // `navigator.standalone` esiste SOLO in Safari su iOS, dove beforeinstallprompt non arriva
  // mai: lì l'installazione è un gesto manuale, e l'unica cosa utile è dire quale.
  const iOS = "standalone" in navigator;
  if (!invito && !iOS) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {!invito && <Share className="size-3.5 shrink-0" />}
        {invito ? t("pwa.desc") : t("pwa.ios")}
      </span>
      {invito && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => {
            invito.prompt();
            setInvito(null); // l'evento si spende una volta: se rifiuta, l'invito non torna
          }}
        >
          <Download />
          {t("pwa.install")}
        </Button>
      )}
    </div>
  );
}
