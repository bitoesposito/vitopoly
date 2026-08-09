import { TOKEN_COLOR, tokenLetter } from "@/lib/palette";

// Il timbro del giocatore: lo stesso quadrato che sta sulla pedina, sulle righe del
// roster e sui chip degli scambi. La lettera è l'identità — il colore da solo non basta.
export function TokenStamp({ token, className = "" }: { token: number; className?: string }) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center font-mono text-micro leading-none ring-1 ring-paper-ink/50 ${className}`}
      style={{ background: TOKEN_COLOR[token % 8], color: "var(--color-paper-ink)" }}
    >
      {tokenLetter(token)}
    </span>
  );
}
