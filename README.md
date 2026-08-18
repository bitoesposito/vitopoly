# Tangentopoly

Un gioco da tavolo online, in tempo reale, per quanti amici vuoi: la plancia del
Monopoly riscritta come satira di Tangentopoli. Le serie di caselle sono regioni in
scalata di malaffare, da Foggia alla Milano di Mani Pulite; le "ferrovie" sono
partecipate di Stato (Poste, INPS, Enel, RAI), le "società" sono concessioni
(Autostrade, Equitalia), il Parcheggio Gratuito è la Latitanza e il Vai in Prigione è
Mani Pulite.

Niente account, niente installazione: si crea una stanza e si manda il link.

## Avvio

```bash
pnpm install
pnpm dev
```

`pnpm dev` alza in parallelo il client Vite e il Worker (`packages/server`, via
wrangler). Il client si aspetta il server su `http://localhost:8787`, sovrascrivibile
con `VITE_SERVER_URL`.

Altri comandi: `pnpm build`, `pnpm typecheck`, `pnpm lint`, e `pnpm --filter
@tangentopoly/game test` per la suite del motore.

## Com'è fatto

| Dove               | Cosa                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `src/`             | il client React (Vite, Tailwind 4, shadcn/ui, zustand). È la radice del workspace.                 |
| `packages/game/`   | il motore: puro, senza I/O, RNG con seed e quindi rigiocabile nei test. È l'autorità sulle regole. |
| `packages/server/` | Cloudflare Worker: una stanza = un Durable Object, stato in un solo blob JSON, WebSocket.          |

Il motore decide, l'interfaccia racconta: il server manda stati interi e il client li
riproduce come una linea temporale (`src/lib/net/choreography.ts`) — la pedina cammina, la carta
esce, poi il salto in prigione — senza mai divergere dallo stato autoritativo.

Le regole sono fisse e uguali per tutte le partite: stanno in `DEFAULT_SETTINGS`
(`packages/game/src/setup.ts`) e non esiste né un'interfaccia né un'azione di rete per
cambiarle.

### Dove mettere una logica nuova

Il motore è diviso in quattro strati, e ognuno può importare solo quelli sopra di sé:

| Strato     | Cosa contiene                                          | Esempio                                |
| ---------- | ------------------------------------------------------ | -------------------------------------- |
| `data/`    | tabellone e mazzi come dati, zero logica               | `tiles.ts`, `cards.ts`                 |
| `rules/`   | matematica e predicati puri, nessuna mutazione di fase | `rent.ts`, `landing.ts`, `property.ts` |
| `core/`    | la macchina condivisa che muta lo stato                | `money.ts`, `movement.ts`, `estate.ts` |
| `actions/` | un file per famiglia di `ClientAction`                 | `turn.ts`, `auction.ts`, `debt.ts`     |

`engine.ts` non contiene regole: contiene la **topologia** (`HANDLERS`), cioè quale azione
è raggiungibile da quale nodo. Una regola nuova si aggiunge in `rules/`, l'azione che la
usa in `actions/`, e la riga corrispondente nella tabella.

Lato client la stessa disciplina: `lib/selectors.ts` per le derivazioni pure sullo stato,
`lib/net/` per il trasporto, e i componenti divisi per zona dello schermo
(`components/board/`, `components/panels/`, `components/lobby/`).

## Documenti

- [`PRODUCT.md`](PRODUCT.md) — verità di prodotto: utenti, scopo, vincoli, cosa non va
  inventato.
- [`DESIGN.md`](DESIGN.md) — il sistema di design ricavato dal codice costruito.
- [`ANALYTICS.md`](ANALYTICS.md) — cosa misuriamo in produzione, lo schema dei punti e le
  query pronte per leggerli.
- `scripts/dev-shot.mjs` — screenshot di un singolo scenario `/dev`: guardarla è l'unico
  modo per verificarne l'aspetto.
- `scripts/prova-server.mjs` — il confine di fiducia del server contro un server vero:
  segreti di posto, impostore respinto, rientro, `/debug` chiuso, nessun timer a stanza
  vuota. Vuole `pnpm dev` acceso.
- `scripts/prova-schermate.mjs` — le tredici schermate di `/dev` montate in un browser
  vero, mobile e desktop: ordini di hook, portal mancanti e null al render non li vedono
  né `tsc` né i test in memoria. Vuole `pnpm serve` acceso.
- `scripts/prova-pwa.mjs` — l'app è installabile e si apre senza rete: manifest, icone
  servite davvero, worker che prende il controllo, `#root` pieno da offline. Vuole il
  BUILD servito (`pnpm build && pnpm preview --port 4173`), perché il service worker si
  registra solo in produzione.
- `scripts/icone.mjs` — rigenera i PNG delle icone dagli SVG in `public/`. La fonte è
  vettoriale, i raster sono derivati: si modifica `icona.svg` e si rilancia.
