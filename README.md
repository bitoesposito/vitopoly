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

| Dove | Cosa |
|---|---|
| `src/` | il client React (Vite, Tailwind 4, shadcn/ui, zustand). È la radice del workspace. |
| `packages/game/` | il motore: puro, senza I/O, RNG con seed e quindi rigiocabile nei test. È l'autorità sulle regole. |
| `packages/server/` | Cloudflare Worker: una stanza = un Durable Object, stato in un solo blob JSON, WebSocket. |

Il motore decide, l'interfaccia racconta: il server manda stati interi e il client li
riproduce come una linea temporale (`src/lib/ws.ts`) — la pedina cammina, la carta
esce, poi il salto in prigione — senza mai divergere dallo stato autoritativo.

Le regole sono fisse e uguali per tutte le partite: stanno in `DEFAULT_SETTINGS`
(`packages/game/src/setup.ts`) e non esiste né un'interfaccia né un'azione di rete per
cambiarle.

## Documenti

- [`PRODUCT.md`](PRODUCT.md) — verità di prodotto: utenti, scopo, vincoli, cosa non va
  inventato.
- [`DESIGN.md`](DESIGN.md) — il sistema di design ricavato dal codice costruito.
- `scripts/shot.mjs` e `scripts/dev-shot.mjs` — screenshot dell'app viva (partita a due,
  o un singolo scenario `/dev`): guardarla è l'unico modo per verificarne l'aspetto.
