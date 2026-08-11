import { Toaster as Sonner } from "sonner";

// theme hardcoded "dark" (app is always dark) — no next-themes dep.
// Colori/raggio agganciati ai token dell'app invece del default sonner.
export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      toastOptions={{ classNames: { toast: "!p-2 !px-3" } }} // padding sonner è inline → serve !
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
