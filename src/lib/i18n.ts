import { BOARD } from "@tangentopoly/game";

// Gioco monolingua italiano. t(key, vars) sostituisce {var}; chiave mancante -> chiave.
// I nomi delle caselle vivono in BOARD (già in italiano).

type Vars = Record<string, string | number>;

const IT: Record<string, string> = {
  "lobby.joining": "Ti stanno aspettando — scrivi il tuo nome",
  "lobby.creating": "Apri una stanza — scrivi il tuo nome",
  "lobby.name": "Il tuo nome",
  "lobby.enter": "Entra nel giro",
  "lobby.create": "Crea la stanza",
  "lobby.serie": "Serie 1992",
  "lobby.newIssue": "Nuova emissione",
  "lobby.pitch":
    "Da Foggia alla Milano di Mani Pulite: compri, incassi, corrompi e prima o poi finisci dentro. Quanti amici vuoi, in tempo reale.",
  "lobby.noAccount": "Niente account, niente installazione: serve solo il link.",

  "id.title": "Chi sei",
  "id.name": "Il tuo nome",
  "id.rename": "Cambia",
  "id.nameEmpty": "Serve un nome.",
  "id.nameTaken": "Quel nome è già di un altro giocatore.",
  "id.ink": "Il tuo inchiostro",
  "id.inkTaken": "{ink} — già di {name}",
  "id.inkHint": "Sei {ink}. Sulla plancia le tue proprietà si tingono di questo colore.",
  "settings.hostStarts": "Tocca a {name} far partire la partita.",
  "settings.invite": "Invita giocatori",
  "settings.inviteAlone": "Sei solo — il giro non si fa da soli, condividi il link. Non c'è un tetto di posti.",
  "settings.inviteDesc": "Copia e condividi il link della stanza",
  "settings.waiting": "In attesa di giocatori…",
  "settings.start": "Inizia partita",

  "players.title": "Giocatori ({n})",
  "players.you": "(tu)",
  "players.out": "fuori",
  "players.vacationPot": "Malloppo",
  "aria.host": "host",
  "aria.jail": "in prigione",
  "aria.jailCards": "carte uscita di prigione",
  "aria.disconnected": "disconnesso",
  "a11y.skipToAction": "Salta la plancia, vai all'azione",
  "aria.openChat": "Apri chat",
  "aria.closeChat": "Chiudi chat",
  "chat.empty": "Nessun messaggio. Scrivi qualcosa.",
  "chat.placeholder": "Messaggio… (scrivi e basta)",
  "chat.send": "Invia",

  "share.copied": "Link copiato negli appunti",
  "share.inviteText": "Entra nel giro!",
  "net.reconnecting": "Connessione persa — riconnessione…",
  "net.stuck": "Non riusciamo a riconnetterci. La partita è salva sul server.",
  "net.reload": "Ricarica",
  "net.bankrupt": "Sei fuori dal giro: bancarotta. Puoi restare a guardare.",
  "spec.banner": "Partita già iniziata — stai guardando come spettatore",

  "center.turnOf": "turno di",
  "center.yourTurn": "È il tuo turno",
  "center.yourCash": "Hai",
  "center.roll": "Tira i dadi",
  "center.rollAgain": "Doppio! Tira ancora",
  "center.endTurn": "Fine turno →",
  "center.payBail": "Paga cauzione €50",
  "center.useJailCard": "Usa carta",
  "center.winner": "{name} si prende tutto!",
  "center.nobody": "Nessuno",
  "end.worth": "Patrimonio finale: contante + titoli (ipotecati a metà)",
  "end.again": "Nuova partita",
  "aria.rolled": "Hai tirato {d1} e {d2}",
  // gli importi arrivano già formattati da euro() — niente € nei template
  "ev.paid": "{from} paga {amount} a {to}",
  "ev.goSalary": "{name} passa dal VIA e ritira {amount}",
  "ev.bail": "{name} paga {amount} di cauzione",
  "ev.tax": "{name} paga una tassa di {amount}",
  "ev.bought": "{name} compra {tile}",
  "ev.vacation": "{name} incassa il malloppo: {amount}",
  "ev.bank": "banca",
  "ev.auctionWon": "{name} compra {tile} all'asta per {price}",
  "ev.jailed": "{name} finisce in prigione",
  "ev.jailedYou": "Dritto in prigione!",
  "ev.bankrupt": "{name} è in bancarotta",
  "ev.card": "{name} pesca: {text}",
  "ev.traded": "{a} e {b} completano uno scambio",
  "ev.build": "{name} compra una casa a {tile}",
  "ev.buildHotel": "{name} compra un hotel a {tile}",
  "ev.sellHouse": "{name} vende una casa a {tile}",
  "ev.sellHotel": "{name} vende un hotel a {tile}",
  "ev.mortgage": "{name} ipoteca {tile} per {amount}",
  "ev.unmortgage": "{name} riscatta {tile} per {amount}",
  "ev.sellProperty": "{name} vende {tile} alla banca per {amount}",
  "kick.vote": "Vota per espellere {name}",
  "kick.confirm": "Votare per espellere {name}? Se anche gli altri votano, esce dalla partita.",

  "buy.q": "Comprare {name} per",
  "buy.buy": "Compra",
  "buy.short": "Ti mancano {amount}: puoi ipotecare o vendere dal pannello Proprietà.",
  "buy.declineAuction": "Rifiuta (asta)",
  "buy.decline": "Rifiuta",
  "auction.title": "Asta: {name}",
  "auction.current": "Offerta attuale",
  "auction.none": "(nessuna offerta)",
  "auction.by": "di {name}",
  "auction.noBids": "Ancora nessuna offerta",
  "auction.custom": "La tua offerta…",
  "auction.raise": "Offri",
  "auction.fold": "Passo — mi ritiro dall'asta",
  "auction.outbid": "Ti hanno superato",
  "auction.max": "Hai solo {amount}",
  "auction.tooLow": "Devi superare {amount}",
  "popup.chance": "Blitz",
  "popup.chest": "Favori",
  "popup.jail": "Prigione",
  "popup.buy": "Nuova proprietà",
  "popup.trade": "Scambio",
  "debt.someone": "{name} sta risolvendo un debito da {total}…",
  "debt.youOwe": "Devi {total} a {to}",
  "debt.help": "Vendi, ipoteca o svendi alla banca dal pannello Proprietà — i soldi si trovano, o dichiari bancarotta.",
  "debt.pay": "Paga",
  "debt.bankrupt": "Bancarotta",
  "debt.bankruptHint": "Esci dal giro e lasci tutto alla banca.",
  "debt.confirmBankrupt": "Dichiarare bancarotta? Lo Stato si riprende tutto e tu esci dal giro.",
  "assets.title": "Le tue proprietà ({n})",
  "assets.notNow": "Non in questo momento del turno.",
  "assets.mortgage": "Ipoteca +{amount}",
  "assets.unmortgage": "Riscatta {amount}",
  "assets.sell": "Vendi +{amount}",
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

  // Regolamento: è una VARIANTE, queste caselle non si scoprono se non atterrandoci sopra.
  "rules.title": "Come si gioca",
  "rules.turn": "Il giro",
  "rules.turnBody":
    "L'ordine di turno si sorteggia. Tiri due dadi e avanzi: se la casella è libera la compri, se la rifiuti va all'asta; se è di un altro, paghi l'affitto — anche quando il proprietario è in prigione. Doppio = tiri ancora; tre doppi di fila e finisci dentro. Ogni volta che passi dal VIA ritiri €{salary}; la cauzione per uscire di prigione è €{bail}.",
  "rules.series": "Le serie",
  "rules.seriesBody":
    "Le otto serie sono regioni in scalata di malaffare, da Foggia alla Milano di Mani Pulite: più sali, più costano e più rendono. Con tutta una serie in mano l'affitto base raddoppia e puoi costruire, anche in modo disomogeneo. Le proprietà si possono ipotecare per fare cassa.",
  "rules.state": "Partecipate e concessioni",
  "rules.stateBody":
    "Poste, INPS, Enel e RAI rendono €25 / €50 / €100 / €200 a seconda di quante ne possiedi. Autostrade ed Equitalia sono concessioni: il pedaggio è il tiro dei dadi ×4, e ×10 se le hai entrambe.",
  "rules.special": "Le caselle speciali",
  "rules.tangente": "Tangente / Mazzetta",
  "rules.tangenteDesc": "Paghi €200 (o €100) senza fare domande.",
  "rules.blitz": "Blitz",
  "rules.blitzDesc": "Peschi una carta: perquisizioni, pentiti, sequestri. Raramente finisce bene.",
  "rules.favori": "Favori",
  "rules.favoriDesc": "Peschi una carta: qualcuno ti deve qualcosa, e prima o poi paga.",
  "rules.latitanza": "Latitanza",
  "rules.latitanzaDesc": "Nessuno ti chiede niente, e chi ci atterra incassa il malloppo: tutto quello che tasse e mazzette hanno accumulato.",
  "rules.maniPulite": "Mani Pulite",
  "rules.maniPuliteDesc": "Ti beccano: dritto in prigione, senza passare dal VIA.",
  "rules.prigione": "In Prigione",
  "rules.prigioneDesc": "Di passaggio non succede niente. Dentro esci con un doppio, con la cauzione o con una carta.",
  "rules.clock": "L'orologio",
  "rules.clockBody":
    "Ogni attesa ha una scadenza e il timer è visibile accanto al turno. Se scade, decide il server al posto tuo: tira, rifiuta l'acquisto o chiude il turno. Su un debito scaduto tenta il pagamento e, se non bastano i soldi, dichiara bancarotta. L'asta parte con 10 secondi e ne aggiunge 6 a ogni rilancio.",

  "info.when": "quando",
  "info.get": "ottieni",
  "info.rent0": "Affitto base",
  "info.rent1": "1 casa",
  "info.rent2": "2 case",
  "info.rent3": "3 case",
  "info.rent4": "4 case",
  "info.rent5": "Hotel",
  "info.owner": "di",
  "info.ownerYou": "tua",
  "info.price": "Prezzo",
  "info.house": "Casa",
  "tile.mortgaged": "Ipoteca",
  "info.go": "Passa dal VIA e ritira €{amount}.",
  "info.jail": "Sei solo di passaggio, a meno che tu non sia in prigione.",
  "info.parking": "Latitanza: qui nessuno ti chiede niente.",
  "info.parkingPot": "Latitanza: chi ci atterra incassa il malloppo (€{pot}).",
  "info.gotojail": "Mani Pulite ti becca: dritto in prigione, senza passare dal VIA.",
  "info.chance": "Peschi una carta Blitz: raramente finisce bene.",
  "info.chest": "Peschi una carta Favori: qualcuno ti deve qualcosa.",
  "info.tax": "Qualcuno va pagato: €{amount} alla banca, senza fare domande.",
  "info.railroad": "Rendita in base alle partecipate possedute: €25 / €50 / €100 / €200.",
  "info.utility": "Pedaggio = tiro dei dadi ×4 (×10 con entrambe le concessioni in mano).",
};

export function translate(key: string, vars?: Vars): string {
  let s = IT[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}

// Monolingua: nessuna sottoscrizione, l'hook esiste solo per la firma t(key, vars).
export function useT() {
  return translate;
}

export function tileName(i: number): string {
  return BOARD[i].name;
}

export function useTileName() {
  return tileName;
}

