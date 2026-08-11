import { cn } from "@/lib/utils";

// L'unico riquadro dell'app: un pannello = una responsabilità del giocatore (chi c'è, cosa
// si sta battendo, cosa si scambia, cosa possiedi), più il pannello asta. Era la card di
// shadcn: sette slot e una variabile di spaziatura per farli combaciare, di cui usavamo due.
export function Panel({ className, children, ref }: { className?: string; children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-2 overflow-hidden bg-card p-2 text-xs/relaxed text-card-foreground ring-1 ring-foreground/25",
        className
      )}
    >
      {children}
    </div>
  );
}
