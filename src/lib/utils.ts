import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// tile index 0..39 -> 11x11 grid cell, GO top-left
export function tileCell(i: number): { row: number; col: number } {
  if (i <= 10) return { row: 1, col: 1 + i };
  if (i <= 20) return { row: 1 + (i - 10), col: 11 };
  if (i <= 30) return { row: 11, col: 11 - (i - 20) };
  return { row: 11 - (i - 30), col: 1 };
}

// token walk duration for n board steps — shared by Tokens.tsx and the ws event choreography
export const walkMs = (steps: number) => Math.min(300 + steps * 45, 800);
