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
  { text: "Advance to GO — collect $200", fx: { k: "goto", tile: 0 } },
  { text: "Advance to Illinois Ave", fx: { k: "goto", tile: 24 } },
  { text: "Advance to St. Charles Place", fx: { k: "goto", tile: 11 } },
  { text: "Advance to the nearest Utility", fx: { k: "gotoNearest", kind: "utility" } },
  { text: "Advance to the nearest Railroad", fx: { k: "gotoNearest", kind: "railroad" } },
  { text: "Bank pays you a dividend of $50", fx: { k: "collect", amount: 50 } },
  { text: "Get Out of Jail Free", fx: { k: "jailCard" } },
  { text: "Go back 3 spaces", fx: { k: "back", n: 3 } },
  { text: "Go directly to Jail", fx: { k: "gotoJail" } },
  { text: "General repairs: $25 per house, $100 per hotel", fx: { k: "repairs", house: 25, hotel: 100 } },
  { text: "Pay poor tax of $15", fx: { k: "pay", amount: 15 } },
  { text: "Take a trip to Reading Railroad", fx: { k: "goto", tile: 5 } },
  { text: "Advance to Boardwalk", fx: { k: "goto", tile: 39 } },
  { text: "Chairman of the board: pay each player $50", fx: { k: "payEach", amount: 50 } },
  { text: "Building loan matures: collect $150", fx: { k: "collect", amount: 150 } },
  { text: "You won a crossword competition: collect $100", fx: { k: "collect", amount: 100 } },
];

export const CHEST: readonly CardDef[] = [
  { text: "Advance to GO — collect $200", fx: { k: "goto", tile: 0 } },
  { text: "Bank error in your favor: collect $200", fx: { k: "collect", amount: 200 } },
  { text: "Doctor's fee: pay $50", fx: { k: "pay", amount: 50 } },
  { text: "Sale of stock: collect $50", fx: { k: "collect", amount: 50 } },
  { text: "Get Out of Jail Free", fx: { k: "jailCard" } },
  { text: "Go directly to Jail", fx: { k: "gotoJail" } },
  { text: "Holiday fund matures: collect $100", fx: { k: "collect", amount: 100 } },
  { text: "Income tax refund: collect $20", fx: { k: "collect", amount: 20 } },
  { text: "It's your birthday: collect $10 from every player", fx: { k: "collectEach", amount: 10 } },
  { text: "Life insurance matures: collect $100", fx: { k: "collect", amount: 100 } },
  { text: "Pay hospital fees of $100", fx: { k: "pay", amount: 100 } },
  { text: "Pay school fees of $50", fx: { k: "pay", amount: 50 } },
  { text: "Consultancy fee: collect $25", fx: { k: "collect", amount: 25 } },
  { text: "Street repairs: $40 per house, $115 per hotel", fx: { k: "repairs", house: 40, hotel: 115 } },
  { text: "Beauty contest second prize: collect $10", fx: { k: "collect", amount: 10 } },
  { text: "You inherit $100", fx: { k: "collect", amount: 100 } },
];
