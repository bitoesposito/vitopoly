import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Casa di `cn`. Tutto il resto vive in moduli con un nome: format.ts, board-layout.ts,
// palette.ts.
/** Il breakpoint md, in una fonte sola. `48rem` e non `768px`: il root scala con la
 *  finestra, quindi i due valori non coincidono. */
export const daMd = () => matchMedia("(min-width: 48rem)").matches;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
