import { toast } from "@/components/ui/sonner";
import { useGame } from "@/lib/store";
import { translate } from "@/lib/i18n";

// Copia SEMPRE il link negli appunti; in più, su vero mobile apre il pannello share nativo.
export async function shareInvite(code: string | null): Promise<void> {
  const t = (k: string) => translate(useGame.getState().lang, k);
  const link = `${location.origin}${location.pathname}?room=${code}`;
  await navigator.clipboard.writeText(link).catch(() => {});
  toast.success(t("share.copied"));
  if (typeof navigator.share === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches) {
    try {
      await navigator.share({ title: "tangentopoly", text: t("share.inviteText"), url: link });
    } catch {
      // annullato / non supportato: il link è già negli appunti
    }
  }
}
