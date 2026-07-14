import { toast } from "@/components/ui/sonner";
import { useGame } from "@/lib/store";
import { translate } from "@/lib/i18n";

// Copia il link negli appunti (toast solo se riesce davvero — l'auto-copia senza gesto
// può essere bloccata dal browser); su vero mobile apre anche il pannello share nativo.
export async function shareInvite(code: string | null, copyOnly = false): Promise<void> {
  const t = (k: string) => translate(useGame.getState().lang, k);
  const link = `${location.origin}${location.pathname}?room=${code}`;
  const copied = await navigator.clipboard.writeText(link).then(() => true).catch(() => false);
  if (copied) toast.success(t("share.copied"));
  if (!copyOnly && typeof navigator.share === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches) {
    try {
      await navigator.share({ title: "tangentopoly", text: t("share.inviteText"), url: link });
    } catch {
      // annullato / non supportato: il link è già negli appunti
    }
  }
}
