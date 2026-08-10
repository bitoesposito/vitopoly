import { toast } from "@/components/ui/sonner";
import { translate as t } from "@/lib/i18n";
import { transferLink } from "@/lib/seat";

/** Il link d'invito. Dove il sistema ha il suo foglio di condivisione è quello a
 *  spedirlo, e gli appunti non c'entrano: copiare in silenzio dietro al foglio aggiungeva
 *  un "copiato" che contraddiceva quello che l'utente stava già facendo.
 *
 *  La discriminante è il DISPOSITIVO, non la larghezza della finestra: `hover: none` e
 *  `pointer: coarse` li ha un telefono, non un browser desktop strizzato — quello resta
 *  hover+fine a qualunque dimensione e continua a passare dagli appunti. */
export async function shareInvite(code: string | null): Promise<void> {
  const link = `${location.origin}${location.pathname}?room=${code}`;
  if (typeof navigator.share === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches) {
    try {
      return await navigator.share({ title: "tangentopoly", text: t("share.inviteText"), url: link });
    } catch (e) {
      // annullato a mano: non insistere con gli appunti, la risposta è già "non adesso".
      // Qualunque altro errore (permesso negato, foglio non disponibile) merita il ripiego.
      if ((e as Error)?.name === "AbortError") return;
    }
  }
  const copied = await navigator.clipboard
    .writeText(link)
    .then(() => true)
    .catch(() => false);
  // toast solo su successo vero: una copia senza gesto può essere bloccata dal browser
  toast[copied ? "success" : "error"](t(copied ? "share.copied" : "share.failed"));
}

/** Copia il link che sposta il TUO posto su un altro dispositivo. È una credenziale al
 *  portatore: chi ce l'ha entra come te. Per questo non passa dal foglio di condivisione
 *  nativo — te lo mandi da solo, non lo si gira al gruppo per sbaglio. */
export async function copySeatLink(code: string, pid: string): Promise<void> {
  const ok = await navigator.clipboard
    .writeText(transferLink(code, pid))
    .then(() => true)
    .catch(() => false);
  if (ok) toast.success(t("seat.copied"), { description: t("seat.warning") });
  else toast.error(t("seat.failed"));
}
