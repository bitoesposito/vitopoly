import { BOARD } from "@tangentopoly/game";
import { IT } from "./it";

// t(key, vars) sostituisce {var}. Le chiavi sono tipizzate sulla tabella: un refuso o una
// rinomina non arrivano più a schermo, non compilano. Il fallback alla chiave resta per le
// stringhe composte a runtime, che il compilatore verifica comunque a pezzi.

type Vars = Record<string, string | number>;

/** Ogni chiave esistente nella tabella italiana. */
export type MsgKey = keyof typeof IT;

export function translate(key: MsgKey, vars?: Vars): string {
  let s: string = IT[key];
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}

export const tileName = (i: number): string => BOARD[i].name;

// Monolingua: nessuna sottoscrizione. Gli hook esistono solo per la firma, così il
// giorno in cui servisse una seconda lingua i componenti non cambiano.
export const useT = () => translate;
export const useTileName = () => tileName;
