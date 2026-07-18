import { toast } from "@/components/ui/sonner";
import { translate as t } from "@/lib/i18n";

// copy the invite link (toast only on real success — gestureless copy can be blocked);
// on true mobile also open the native share sheet
export async function shareInvite(code: string | null, copyOnly = false): Promise<void> {
  const link = `${location.origin}${location.pathname}?room=${code}`;
  const copied = await navigator.clipboard.writeText(link).then(() => true).catch(() => false);
  if (copied) toast.success(t("share.copied"));
  if (!copyOnly && typeof navigator.share === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches) {
    try {
      await navigator.share({ title: "tangentopoly", text: t("share.inviteText"), url: link });
    } catch {
      // cancelled / unsupported: link is already in the clipboard
    }
  }
}
