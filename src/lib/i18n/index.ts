import { BOARD } from "@tangentopoly/game";
import { IT } from "./it";

// t(key, vars) sostituisce {var}. Le chiavi sono tipizzate sulla tabella: un refuso non
// arriva a schermo, non compila. Niente hook: il gioco è monolingua e queste sono funzioni
// pure — se servisse una seconda lingua, si aggiunge quel giorno.

type Vars = Record<string, string | number>;

/** Ogni chiave esistente nella tabella italiana. */
export type MsgKey = keyof typeof IT;

export function translate(key: MsgKey, vars?: Vars): string {
  let s: string = IT[key];
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}

export const tileName = (i: number): string => BOARD[i].name;
