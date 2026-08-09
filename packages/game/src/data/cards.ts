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
  { text: "Torna al VIA e ritira €200", fx: { k: "goto", tile: 0 } },
  { text: "Convocazione d'urgenza nella capitale: vai a Roma", fx: { k: "goto", tile: 24 } },
  { text: "Affare in nero: vai a Caserta", fx: { k: "goto", tile: 11 } },
  { text: "Cartella esattoriale in arrivo: vai alla concessione più vicina", fx: { k: "gotoNearest", kind: "utility" } },
  { text: "Ti vogliono sistemare: vai alla partecipata più vicina", fx: { k: "gotoNearest", kind: "railroad" } },
  { text: "Dividendo della cricca: ritira €50", fx: { k: "collect", amount: 50 } },
  { text: "Un amico giudice: esci gratis di prigione", fx: { k: "jailCard" } },
  { text: "Ti stanno pedinando: torna indietro di 3 caselle", fx: { k: "back", n: 3 } },
  { text: "Arresto in flagranza: dritto in Prigione", fx: { k: "gotoJail" } },
  { text: "Il collaudatore si è svegliato: €25 a casa, €100 a hotel", fx: { k: "repairs", house: 25, hotel: 100 } },
  { text: "Il vigile vuole il caffè: paga €15", fx: { k: "pay", amount: 15 } },
  { text: "Raccomandata in giacenza: presentati alle Poste", fx: { k: "goto", tile: 5 } },
  { text: "Il capo ti vuole: vai a Milano", fx: { k: "goto", tile: 39 } },
  { text: "Giro di mazzette: paga €50 a ogni giocatore", fx: { k: "payEach", amount: 50 } },
  { text: "L'appalto truccato va in porto: ritira €150", fx: { k: "collect", amount: 150 } },
  { text: "Vinci il ricorso al TAR: ritira €100", fx: { k: "collect", amount: 100 } },
];

export const CHEST: readonly CardDef[] = [
  { text: "Torna al VIA e ritira €200", fx: { k: "goto", tile: 0 } },
  { text: "Fondo nero dimenticato: ritira €200", fx: { k: "collect", amount: 200 } },
  { text: "L'avvocato si fa vivo: paga €50", fx: { k: "pay", amount: 50 } },
  { text: "Consulenza fantasma: ritira €50", fx: { k: "collect", amount: 50 } },
  { text: "Insufficienza di prove: esci gratis di prigione", fx: { k: "jailCard" } },
  { text: "Un pentito fa il tuo nome: dritto in Prigione", fx: { k: "gotoJail" } },
  { text: "Il conto a Lugano frutta: ritira €100", fx: { k: "collect", amount: 100 } },
  { text: "Rimborso elettorale: ritira €20", fx: { k: "collect", amount: 20 } },
  { text: "È il tuo onomastico: ogni giocatore porta la busta, €10", fx: { k: "collectEach", amount: 10 } },
  { text: "Eredità dello zio prefetto: ritira €100", fx: { k: "collect", amount: 100 } },
  { text: "Ricovero in clinica privata: paga €100", fx: { k: "pay", amount: 100 } },
  { text: "Retta del collegio svizzero: paga €50", fx: { k: "pay", amount: 50 } },
  { text: "Gettone di presenza: ritira €25", fx: { k: "collect", amount: 25 } },
  { text: "Il comune sequestra i cantieri: €40 a casa, €115 a hotel", fx: { k: "repairs", house: 40, hotel: 115 } },
  { text: "Vinci la lotteria parrocchiale (truccata): ritira €10", fx: { k: "collect", amount: 10 } },
  { text: "Svendono la municipalizzata, la tua fetta: €100", fx: { k: "collect", amount: 100 } },
];
