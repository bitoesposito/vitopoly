// Card decks as pure data. flow.ts interprets the fx descriptors — no logic here, no cycles.

export type CardFx =
  | { k: "goto"; tile: number } // advance forward, GO salary on pass
  | { k: "gotoNearest"; kind: "railroad" | "utility" }
  | { k: "back"; n: number } // no GO salary
  | { k: "collect"; amount: number }
  | { k: "pay"; amount: number }
  | { k: "collectEach"; amount: number } // from every other player
  | { k: "payEach"; amount: number } // to every other player
  | { k: "jailCard" }
  | { k: "gotoJail" }
  | { k: "repairs"; house: number; hotel: number };

export interface CardDef {
  text: string;
  fx: CardFx;
}

export const CHANCE: readonly CardDef[] = [
  { text: "Vai al VIA e ritira $200", fx: { k: "goto", tile: 0 } },
  { text: "Vai a Roma", fx: { k: "goto", tile: 24 } },
  { text: "Vai a Nizza", fx: { k: "goto", tile: 11 } },
  { text: "Vai alla società più vicina", fx: { k: "gotoNearest", kind: "utility" } },
  { text: "Vai alla stazione più vicina", fx: { k: "gotoNearest", kind: "railroad" } },
  { text: "La banca ti paga un dividendo di $50", fx: { k: "collect", amount: 50 } },
  { text: "Esci gratis di prigione", fx: { k: "jailCard" } },
  { text: "Torna indietro di 3 caselle", fx: { k: "back", n: 3 } },
  { text: "Vai dritto in prigione", fx: { k: "gotoJail" } },
  { text: "Riparazioni generali: $25 a casa, $100 a hotel", fx: { k: "repairs", house: 25, hotel: 100 } },
  { text: "Paga la tassa di povertà: $15", fx: { k: "pay", amount: 15 } },
  { text: "Fai un viaggio fino alla Stazione Nord", fx: { k: "goto", tile: 5 } },
  { text: "Vai a Tokyo", fx: { k: "goto", tile: 39 } },
  { text: "Presidente del consiglio: paga $50 a ogni giocatore", fx: { k: "payEach", amount: 50 } },
  { text: "Scade il prestito edilizio: ritira $150", fx: { k: "collect", amount: 150 } },
  { text: "Vinci un concorso di cruciverba: ritira $100", fx: { k: "collect", amount: 100 } },
];

export const CHEST: readonly CardDef[] = [
  { text: "Vai al VIA e ritira $200", fx: { k: "goto", tile: 0 } },
  { text: "Errore bancario a tuo favore: ritira $200", fx: { k: "collect", amount: 200 } },
  { text: "Spese mediche: paga $50", fx: { k: "pay", amount: 50 } },
  { text: "Vendita di azioni: ritira $50", fx: { k: "collect", amount: 50 } },
  { text: "Esci gratis di prigione", fx: { k: "jailCard" } },
  { text: "Vai dritto in prigione", fx: { k: "gotoJail" } },
  { text: "Matura il fondo vacanze: ritira $100", fx: { k: "collect", amount: 100 } },
  { text: "Rimborso delle tasse: ritira $20", fx: { k: "collect", amount: 20 } },
  { text: "È il tuo compleanno: ritira $10 da ogni giocatore", fx: { k: "collectEach", amount: 10 } },
  { text: "Matura l'assicurazione sulla vita: ritira $100", fx: { k: "collect", amount: 100 } },
  { text: "Spese ospedaliere: paga $100", fx: { k: "pay", amount: 100 } },
  { text: "Tasse scolastiche: paga $50", fx: { k: "pay", amount: 50 } },
  { text: "Parcella di consulenza: ritira $25", fx: { k: "collect", amount: 25 } },
  { text: "Riparazioni stradali: $40 a casa, $115 a hotel", fx: { k: "repairs", house: 40, hotel: 115 } },
  { text: "Secondo premio al concorso di bellezza: ritira $10", fx: { k: "collect", amount: 10 } },
  { text: "Erediti $100", fx: { k: "collect", amount: 100 } },
];
