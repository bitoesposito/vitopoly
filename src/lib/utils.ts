import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Casa di `cn` per convenzione shadcn (components.json -> aliases.utils). Tutto il
// resto vive in moduli con un nome: format.ts, board-layout.ts, palette.ts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
