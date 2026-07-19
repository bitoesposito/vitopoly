import { BOARD } from "@tangentopoly/game";

// Gioco monolingua italiano. t(key, vars) sostituisce {var}; chiave mancante -> chiave.
// I nomi delle caselle vivono in BOARD (già in italiano).

type Vars = Record<string, string | number>;

const IT: Record<string, string> = {
  "lobby.joining": "Unisciti alla stanza",
  "lobby.creating": "Crea una nuova partita",
  "lobby.name": "Il tuo nome",
  "lobby.enter": "Entra",
  "lobby.create": "Crea stanza",

  "settings.title": "Impostazioni partita",
  "settings.hostOnly": "Solo l'host ({name}) può modificare le impostazioni.",
  "settings.maxPlayers": "Giocatori max",
  "settings.maxPlayersDesc": "Quanti possono entrare",
  "settings.startingCash": "Soldi iniziali",
  "settings.startingCashDesc": "Cash di partenza a testa",
  "settings.sec.game": "Partita",
  "settings.sec.property": "Proprietà",
  "settings.sec.rent": "Affitti",
  "settings.sec.extra": "Extra",
  "settings.randomOrder": "Ordine fisso",
  "settings.randomOrderDesc": "Turni in ordine di ingresso invece che casuale",
  "settings.auction": "Niente aste",
  "settings.auctionDesc": "Se rifiuti l'acquisto, la proprietà resta alla banca",
  "settings.mortgageAllowed": "Niente ipoteche",
  "settings.mortgageAllowedDesc": "Vietato ipotecare le proprietà",
  "settings.evenBuild": "Costruzione uniforme",
  "settings.evenBuildDesc": "Case e hotel costruiti/venduti in modo uniforme nel set",
  "settings.doubleRentFullSet": "Niente x2 sui set completi",
  "settings.doubleRentFullSetDesc": "Affitto base anche possedendo il set completo",
  "settings.noRentInPrison": "Niente affitto in prigione",
  "settings.noRentInPrisonDesc": "Il proprietario in prigione non incassa affitti",
  "settings.vacationCash": "Niente vacation cash",
  "settings.vacationCashDesc": "Tasse e pagamenti restano alla banca invece di accumularsi su Free Parking",
  "settings.invite": "Invita giocatori",
  "settings.inviteAlone": "Sei solo — condividi il link per far entrare gli altri",
  "settings.inviteDesc": "Copia e condividi il link della stanza",
  "settings.waiting": "In attesa di giocatori…",
  "settings.start": "Inizia partita",

  "players.title": "Giocatori ({n})",
  "players.you": "(tu)",
  "players.vacationPot": "Vacation pot",
  "aria.host": "host",
  "aria.jail": "in prigione",
  "aria.disconnected": "disconnesso",
  "aria.openChat": "Apri chat",
  "aria.closeChat": "Chiudi chat",
  "chat.empty": "Nessun messaggio. Scrivi qualcosa 👋",
  "chat.placeholder": "Messaggio…",
  "chat.send": "Invia",

  "share.copied": "Link copiato negli appunti",
  "share.inviteText": "Unisciti alla partita!",
  "net.reconnecting": "Connessione persa — riconnessione…",
  "spec.banner": "Partita già iniziata — stai guardando come spettatore",

  "center.turnOf": "turno di",
  "center.yourTurn": "È il tuo turno",
  "center.roll": "Tira i dadi",
  "center.rollAgain": "Doppio! Tira ancora",
  "center.endTurn": "Fine turno →",
  "center.payBail": "Paga cauzione $50",
  "center.useJailCard": "Usa carta",
  "center.winner": "{name} vince!",
  "center.nobody": "Nessuno",
  "ev.paid": "{from} paga ${amount} a {to}",
  "ev.goSalary": "{name} passa dal VIA e ritira ${amount}",
  "ev.bail": "{name} paga ${amount} di cauzione",
  "ev.tax": "{name} paga una tassa di ${amount}",
  "ev.bought": "{name} compra {tile}",
  "ev.vacation": "{name} incassa ${amount} di vacation cash",
  "ev.bank": "banca",
  "ev.auctionWon": "{name} compra {tile} all'asta per ${price}",
  "ev.jailed": "{name} va in prigione",
  "ev.jailedYou": "Vai in prigione!",
  "ev.bankrupt": "{name} è in bancarotta",
  "ev.card": "{name} pesca: {text}",
  "ev.traded": "{a} e {b} completano uno scambio",
  "ev.build": "{name} compra una casa a {tile}",
  "ev.buildHotel": "{name} compra un hotel a {tile}",
  "ev.sellHouse": "{name} vende una casa a {tile}",
  "ev.sellHotel": "{name} vende un hotel a {tile}",
  "ev.mortgage": "{name} ipoteca {tile} per ${amount}",
  "ev.unmortgage": "{name} riscatta {tile} per ${amount}",
  "ev.sellProperty": "{name} vende {tile} alla banca per ${amount}",
  "kick.vote": "Vota per espellere {name}",

  "buy.q": "Comprare {name} per",
  "buy.buy": "Compra",
  "buy.declineAuction": "Rifiuta (asta)",
  "buy.decline": "Rifiuta",
  "auction.title": "Asta: {name}",
  "auction.current": "Offerta attuale",
  "auction.none": "(nessuna offerta)",
  "auction.by": "di {name}",
  "auction.noBids": "Ancora nessuna offerta",
  "auction.custom": "Rilancio…",
  "auction.raise": "Rilancia",
  "popup.chance": "Imprevisti",
  "popup.chest": "Probabilità",
  "popup.jail": "Prigione",
  "popup.buy": "Nuova proprietà",
  "popup.trade": "Scambio",
  "debt.someone": "{name} sta risolvendo un debito da ${total}…",
  "debt.youOwe": "Devi ${total}",
  "debt.help": "Vendi case / ipoteca dalle tue proprietà per raccogliere contanti, poi paga — o dichiara bancarotta.",
  "debt.pay": "Paga",
  "debt.bankrupt": "Bancarotta",
  "debt.confirmBankrupt": "Dichiarare bancarotta? Le tue proprietà tornano alla banca ed esci dalla partita.",
  "assets.title": "Le tue proprietà ({n})",
  "assets.mortgage": "Ipoteca +${amount}",
  "assets.unmortgage": "Riscatta ${amount}",
  "assets.sell": "Vendi +${amount}",
  "trade.title": "Scambi",
  "trade.create": "Crea",
  "trade.accept": "Accetta",
  "trade.reject": "Rifiuta",
  "trade.waiting": "scambio con {name} in attesa…",
  "trade.cancel": "Annulla",
  "trade.incoming": "Proposta di {name}",
  "trade.incomingRow": "proposta di {name}",
  "trade.show": "Vedi",
  "trade.back": "Torna agli scambi",
  "ui.details": "Dettagli",
  "trade.propose": "Proponi scambio",
  "trade.pickPlayer": "Scegli un giocatore per vedere cosa può offrire",
  "trade.youGive": "Tu dai",
  "trade.youGet": "Tu ricevi",
  "trade.noProps": "Nessuna proprietà",
  "trade.send": "Invia",
  "bundle.nothing": "niente",

  "info.when": "quando",
  "info.get": "ottieni",
  "info.rent0": "Affitto base",
  "info.rent1": "1 casa",
  "info.rent2": "2 case",
  "info.rent3": "3 case",
  "info.rent4": "4 case",
  "info.rent5": "Hotel",
  "info.price": "Prezzo",
  "info.house": "Casa",
  "tile.mortgaged": "Ipoteca",
  "info.go": "Passa dal VIA e ritira ${amount}.",
  "info.jail": "Sei solo di passaggio, a meno che tu non sia in prigione.",
  "info.parking": "Sosta gratuita: non paghi nulla.",
  "info.parkingPot": "Sosta: chi ci atterra incassa il piatto ({pot}$).",
  "info.gotojail": "Vai direttamente in prigione, senza passare dal VIA.",
  "info.chance": "Peschi una carta Imprevisti.",
  "info.chest": "Peschi una carta Probabilità.",
  "info.tax": "Se ci finisci sopra paghi ${amount} alla banca.",
  "info.railroad": "Affitto in base alle stazioni possedute: $25 / $50 / $100 / $200.",
  "info.utility": "Affitto = tiro dei dadi ×4 (×10 se possiedi entrambi i servizi).",
};

export function translate(key: string, vars?: Vars): string {
  let s = IT[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}

// Hook mantenuto per compatibilità di firma: t(key, vars). Nessuna sottoscrizione.
export function useT() {
  return translate;
}

export function tileName(i: number): string {
  return BOARD[i].name;
}

export function useTileName() {
  return tileName;
}

