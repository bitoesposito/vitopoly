import * as React from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const BASE =
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const VARIANTE = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline:
    "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
  ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
  destructive:
    "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
  link: "text-primary underline-offset-4 hover:underline",
};

// Tre altezze: `lg` l'azione del momento, `default` ogni altra azione vera (stessa
// altezza dell'Input, così una coppia campo+bottone si allinea da sé), `sm` il
// contorno. `xs` e le icone solo per la cromatura. Su touch `default` sale a 44.
const TAGLIA = {
  default: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 pointer-coarse:h-11",
  xs: "h-6 gap-1 px-2 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
  lg: "h-11 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
  icon: "size-8",
  "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-7",
  "icon-lg": "size-9",
};

type Stile = { variant?: keyof typeof VARIANTE; size?: keyof typeof TAGLIA };

/** Le stesse classi per chi veste da bottone senza esserlo: i chip del partner negli scambi. */
export const buttonVariants = ({ variant = "default", size = "default" }: Stile = {}) => cn(BASE, VARIANTE[variant], TAGLIA[size]);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & Stile & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button };
