# Product

<!-- impeccable:product-schema 1 -->

> Provenance: the structured question round for this project ran once and returned "decide yourself"
> for direction and scope. Every fact below is therefore either **verified in the repository**
> (path cited) or explicitly marked `[inferred]`. No user interview confirmed the inferred items.

## Platform

web

## Users

Groups of friends playing one match together in real time. **There is no seat cap**: anyone who
arrives before the host starts the match sits down (`packages/game/src/setup.ts:36`). One player
creates a room and shares a link; the others join by opening it and typing a display name — no
account, no signup anywhere in the codebase. Anyone arriving after the match starts becomes a
spectator with chat and full state but no seat.

The product is monolingual Italian by construction, not by localization default: tile names, card
copy, and UI strings are authored directly in Italian and `i18n.ts` documents the single-language
choice (`src/lib/i18n.ts:3`).

`[inferred]` Mixed devices in the same match — some players on a phone, some on a laptop — since the
join path is a shared link and the layout carries a dedicated mobile arrangement (`src/App.tsx:45`).
`[inferred]` Players know Monopoly's rules and do not know this variant's deviations.

## Product Purpose

Play a full Monopoly-form match in the browser with friends, free, in real time, on a board rewritten
as a satire of the Italian Tangentopoli corruption scandal. Success is a group finishing a match
together — and, `[inferred]`, starting a second one.

## Positioning

The mechanism a neighbouring clone could not truthfully copy is the **re-authored board**, and it is
already built:

- Color sets are Italian regions in ascending order of malaffare, from Foggia to the Milano of Mani
  Pulite (`packages/game/src/board-data.ts:29-73`).
- "Railroads" are state-owned enterprises: Poste Italiane, INPS, Enel, RAI.
- "Utilities" are concessions: Autostrade, Equitalia.
- Tax tiles are `Tangente` (€200) and `Mazzetta` (€100); Free Parking is `Latitanza`; Go-to-Jail is
  `Mani Pulite`; the two card decks are `Blitz` (chance) and `Favori` (community chest).
- 32 authored cards carry the voice ("Il vigile vuole il caffè: paga €15", "Un pentito fa il tuo
  nome", "Il conto a Lugano frutta") — `packages/game/src/cards.ts:20-56`.

Currency is € throughout.

## Operating Context

- **Room lifecycle:** one room = one Cloudflare Durable Object, state persisted as a single JSON blob
  (`packages/server/src/room.ts:10`). Invite by link with a room code; a native share sheet is used
  where available (`src/lib/share.ts`).
- **The rules are fixed and identical in every match.** `DEFAULT_SETTINGS`
  (`packages/game/src/setup.ts`) is the house rulebook: €1500 starting cash, auctions on decline,
  mortgages allowed, double rent on full sets, the `Malloppo` pot on Latitanza, rent still collected
  while the owner is jailed, uneven building allowed, turn order drawn at random. There is no
  settings UI and no `updateSettings` action on the wire — the ability to change rules was removed
  from the protocol, not merely hidden, so nobody can alter them for everyone else by hand-crafting a
  socket message.
- **The server owns time.** Every wait node auto-resolves on a deadline: preRoll 60s, buyPrompt 30s,
  postRoll 60s, debt 120s; auctions run their own clock, 10s to open and 6s after each bid
  (`packages/game/src/timeouts.ts`). A debt timeout attempts payment and then falls back to
  bankruptcy (`packages/server/src/room.ts:133`).
- **Interruptions are expected.** Player id is persisted in localStorage and a rejoin is a no-op
  server-side, with full state replay (`src/lib/store.ts:17`, `packages/server/src/room.ts:40`).
- **Social pressure is a mechanic:** unanimous vote-kick by the other seated players
  (`GameState.kickVotes`, `packages/game/src/types.ts:90`) and in-room chat.

## Capabilities and Constraints

- 40 tiles, 8 color groups, bank of 32 houses and 12 hotels, seeded xorshift32 RNG so dice and
  shuffles are replayable in tests (`packages/game/src/types.ts:79-85`).
- **The engine is authoritative and pure**; the client receives whole states and replays the event
  list as a narrated timeline (`src/lib/ws.ts:65`). Engine invariants are covered by 11 test files
  (`packages/game/test/`).
- Event log is capped at ~100 entries and is the only record of what happened
  (`packages/game/src/types.ts:91`).
- Full action vocabulary the client may send is fixed and enumerated in `ClientAction`
  (`packages/game/src/types.ts`). `fold` is now exposed in the auction panel; `updateSettings` no
  longer exists.
- Undecided product facts: no persistence of results across matches, no accounts, no matchmaking, no
  spectator-to-player promotion, no rematch path. None of these exist in the codebase and none should
  be presented as if they did.

## Brand Commitments

- Name: **Tangentopoly**.
- Italian, single language, second person.
- Currency €.
- The satire's target is the Tangentopoli scandal and Italian institutional corruption, played for
  comedy and never as an accusation against a living named person: every institution on the board is
  an entity, and no real individual is named anywhere in `board-data.ts` or `cards.ts`. Future work
  must not break that.
- No logo, wordmark, or brand asset exists. `public/` is empty and the favicon is still Vite's.

## Evidence on Hand

- Real, authored game content: `packages/game/src/board-data.ts` (40 tiles), `cards.ts` (32 cards),
  `src/lib/i18n.ts` (every UI string).
- A real test suite as proof of correctness: `packages/game/test/` (auction, debt, kick, rejection,
  rules, settings, soak, timeouts).
- **Absent, and not to be fabricated:** logo or wordmark, imagery of any kind, screenshots, player
  counts, testimonials, press, uptime or performance claims, deployment URL. `README.md` is still the
  unmodified Vite + shadcn template.

## Product Principles

1. **The engine decides, the interface narrates.** Authoritative state arrives whole; presentation
   may pace it but may never invent or diverge from it.
2. **The satire is the reason the product exists.** It lives in the board data today; anything that
   makes the match legible must carry it rather than neutralize it.
3. **A link and a name is the whole entry cost.** No account, no install, no tutorial gate.
4. **The server owns the clock, so the interface owes the player time-awareness.** Every wait is
   deadline-bound and can resolve without the player acting.
5. **A match is played together, on whatever device each player has.**

## Accessibility & Inclusion

`[inferred]` No formal standard was ever agreed for this project, but the reason one matters is
structural: every turn is deadline-bound and resolves without the player, so someone who cannot
perceive a state change loses turns rather than merely losing convenience. Treat WCAG 2.2 AA as the
floor.

Shipped since: a single `role="status" aria-live="polite"` announcer carries turn, dice result, buy
prompt and debt (`src/components/Center.tsx`) — the dice result previously existed only as a CSS
transform and was invisible to a screen reader; player identity is carried by a **series letter**
(A–Z, then A2/B2…) on token, roster, standings, chat and trade chips, never by colour alone; the
board is `inert` while an auction holds the turn; the focus ring runs at full alpha. Open: the board
prints the region name only from `lg` up (below that it travels via `sr-only` and the tile popover),
and no contrast measurement has been made against a real render — the values are computed from
tokens.
