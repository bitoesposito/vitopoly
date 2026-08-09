import { BOARD } from "@tangentopoly/game";
import { IT } from "./it";

// t(key, vars) sostituisce {var}. Le chiavi sono tipizzate sulla tabella: un refuso o una
// rinomina non arrivano più a schermo, non compilano.
//
// Niente hook: il gioco è monolingua e queste due sono funzioni pure. Ventitré componenti
// scrivevano `const t = useT()` per ottenere una costante — si importano e basta. Il
// giorno in cui servisse una seconda lingua, quel giorno si aggiunge un hook.

type Vars = Record<string, string | number>;

/** Ogni chiave esistente nella tabella italiana. */
export type MsgKey = keyof typeof IT;

export function translate(key: MsgKey, vars?: Vars): string {
  let s: string = IT[key];
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}

export const tileName = (i: number): string => BOARD[i].name;
