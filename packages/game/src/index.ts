// L'API pubblica del motore: quello che il client e il server hanno il diritto di
// conoscere. Tutto il resto (core/, actions/, i mutatori) è interno.

export * from "./types";
export * from "./protocol";

// tabellone e mazzi, come dati. Chi cammina sull'anello chiede a walkTiles.
export { BOARD, JAIL, GO_SALARY, BAIL, walkTiles } from "./data/tiles";
export type { TileDef, TileKind } from "./data/tiles";
export { CHANCE, CHEST } from "./data/cards";
export type { CardDef, CardFx } from "./data/cards";

// il motore
export { apply, activeNode, legalActions, auctionTimeout } from "./engine";
export { AUCTION_MS, TIMEOUT_MS, timeoutAction, timeoutMs } from "./timeouts";
export { invariantViolations } from "./invariants";

// partita e roster (competenza del server, non azioni di gioco)
export { createGame, addPlayer, setConnected, freeName, freeToken, CASSA_INIZIALE, MAX_NAME, TOKENS } from "./setup";

// regole sulle proprietà: il client le interroga per spegnere i bottoni col motivo giusto
export {
  whyNotBuild,
  whyNotSellHouse,
  whyNotMortgage,
  whyNotUnmortgage,
  whyNotSellProperty,
  unmortgageCost,
  sellValue,
} from "./rules/property";
export type { RulesView } from "./rules/property";
export { rentFor } from "./rules/rent";
