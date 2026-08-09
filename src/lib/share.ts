import { toast } from "@/components/ui/sonner";
import { translate as t } from "@/lib/i18n";
import { transferLink } from "@/lib/seat";

// copy the invite link (toast only on real success — gestureless copy can be blocked);
// on true mobile also open the native share sheet
export async function shareInvite(code: string | null, copyOnly = false): Promise<void> {
  const link = `${location.origin}${location.pathname}?room=${code}`;
  const copied = await navigator.clipboard
    .writeText(link)
    .then(() => true)
    .catch(() => false);
  if (copied) toast.success(t("share.copied"));
  if (!copyOnly && typeof navigator.share === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches) {
    try {
      await navigator.share({ title: "tangentopoly", text: t("share.inviteText"), url: link });
    } catch {
      // cancelled / unsupported: link is already in the clipboard
    }
  }
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
