export * from "./types";
export * from "./protocol";
export { BOARD, JAIL, GO_SALARY, BAIL } from "./board-data";
export type { TileDef, TileKind } from "./board-data";
export { CHANCE, CHEST } from "./cards";
export { apply, activeNode, auctionTimeout, canRaiseCash, legalActions } from "./engine";
export { AUCTION_MS, TIMEOUT_MS, timeoutAction, timeoutMs } from "./timeouts";
export { createGame, addPlayer, setConnected, freeName, freeToken, MAX_NAME, TOKENS } from "./setup";
// Predicati puri delle regole sulle proprietà: il client li usa per spegnere i
// bottoni con il motivo giusto, il motore per validare. Una sola fonte.
export {
  percheNoBuild,
  percheNoSellHouse,
  percheNoMortgage,
  percheNoSellProperty,
  percheNoUnmortgage,
  costoRiscatto,
} from "./properties";
