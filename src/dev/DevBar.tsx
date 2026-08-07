import { useState } from "react";
import { addPlayer, CHANCE, CHEST, createGame } from "@tangentopoly/game";
import type { GameState } from "@tangentopoly/game";
import { Button } from "@/components/ui/button";
import { useGame, type PopupInput } from "@/lib/store";
import { choreograph } from "@/lib/ws";

// dev-only screen simulator. Reachable at /dev in `pnpm dev` builds only
// (gated in main.tsx by import.meta.env.DEV — never bundled in prod).
// To remove: delete src/dev/ and the DevBar lines in main.tsx.

const ME = useGame.getState().myId;

// Real engine state via createGame/addPlayer, then mutated per scenario.
// GameState is structurally a PublicState (seed/decks extra), so the store accepts it.
function base(mut?: (g: GameState) => void): GameState {
  const g = createGame(1);
  addPlayer(g, ME, "Tu");
  addPlayer(g, "p2", "Anna");
  addPlayer(g, "p3", "Bruno");
  g.status = "playing";
  g.log = [
    { e: "paid", from: "p2", to: "bank", amount: 200, why: "tax" },
    { e: "asset", pid: "p2", tile: 1, what: "build", amount: 50, hotel: false },
    { e: "info", text: "— stato simulato /dev —" },
  ];
  mut?.(g);
  return g;
}

function show(g: GameState | null) {
  useGame.setState({
    game: g,
    connected: g !== null,
    code: "dev",
    error: null,
    tokenPos: {},
    popups: [],
    events: g?.log ?? [],
    chat: g
      ? [
          { pid: "p2", name: "Anna", text: "ciao!", ts: 0 },
          { pid: "p2", name: "Anna", text: "pronti?", ts: 0 },
          { pid: ME, name: "Tu", text: "pronti", ts: 0 },
        ]
      : [],
  });
}

const SCENARIOS: [string, () => GameState | null][] = [
  ["Home", () => null],
  ["Impostazioni", () => base((g) => (g.status = "lobby"))],
  ["preRoll (io)", () => base()],
  ["preRoll (altro)", () => base((g) => (g.current = 1))],
  ["buyPrompt", () => base((g) => {
    g.players[0].pos = 39;
    g.phase = { t: "buyPrompt", tile: 39, again: false };
  })],
  ["buyPrompt (a secco)", () => base((g) => {
    g.players[0].pos = 39;
    g.players[0].cash = 120; // Milano costa 400: mancano 280
    g.phase = { t: "buyPrompt", tile: 39, again: false };
  })],
  ["postRoll + prop.", () => base((g) => {
    g.phase = { t: "postRoll", again: false };
    g.props = {
      1: { owner: ME, mortgaged: false, houses: 2 },
      3: { owner: ME, mortgaged: true, houses: 0 },
      5: { owner: ME, mortgaged: false, houses: 0 },
      6: { owner: "p2", mortgaged: false, houses: 0 },
    };
  })],
  ["Asta", () => base((g) => {
    g.stack = [{
      t: "auction", tile: 6, queue: [], bid: 120, leader: "p2", active: [ME, "p2", "p3"],
      bids: [{ pid: "p3", amount: 10 }, { pid: ME, amount: 20 }, { pid: "p2", amount: 120 }],
    }];
    g.deadline = Date.now() + 6_000;
  })],
  ["Debito", () => base((g) => {
    g.players[0].cash = 60;
    g.props[1] = { owner: ME, mortgaged: false, houses: 3 };
    g.stack = [{ t: "debt", debtor: ME, claims: [{ creditor: "p2", amount: 450 }] }];
  })],
  ["Trade in arrivo", () => base((g) => {
    g.props = { 1: { owner: ME, mortgaged: false, houses: 0 }, 6: { owner: "p2", mortgaged: false, houses: 0 } };
    g.trades = [{ id: "t1", from: "p2", to: ME, give: { cash: 100, props: [6], jailCards: 0 }, get: { cash: 0, props: [1], jailCards: 0 } }];
  })],
  ["In prigione", () => base((g) => {
    g.players[0].pos = 10;
    g.players[0].inJail = true;
    g.players[0].jailCards = 1;
  })],
  ["Timer", () => base((g) => (g.deadline = Date.now() + 30_000))],
  ["Fine partita", () => base((g) => {
    g.status = "ended";
    g.winner = "p2";
  })],
];

// EventCard test triggers: every kind the animation can play (+ a stacked burst)
const POPUPS: [string, PopupInput[]][] = [
  ["Blitz", [{ kind: "chance", name: "Anna", text: CHANCE[9].text }]],
  ["Favori", [{ kind: "chest", name: "Anna", text: CHEST[1].text }]],
  ["Prigione", [{ kind: "jailed", name: "Anna", you: false }]],
  ["Acquisto", [{ kind: "buy", name: "Tu", tile: 39, price: 400 }]],
  ["Scambio", [{
    kind: "trade", from: "Anna", to: "Bruno",
    give: { cash: 150, props: [21, 23], jailCards: 0 },
    get: { cash: 0, props: [5], jailCards: 1 },
  }]],
  ["Sequenza", [
    { kind: "chance", name: "Bruno", text: CHANCE[8].text },
    { kind: "jailed", name: "Bruno", you: false },
    { kind: "buy", name: "Anna", tile: 21, price: 220 },
  ]],
];

function popup(ps: PopupInput[]) {
  if (!useGame.getState().game) show(base()); // the overlay lives inside the Board
  useGame.getState().pushPopups(ps);
}

// prova generale: la VERA coreografia di ws.ts su eventi sintetici
// (cammina fino agli Imprevisti, carta "vai in prigione", poi in cella)
function jailTrip() {
  if (!useGame.getState().game) show(base());
  const g = useGame.getState().game!;
  const me = g.players[0].id;
  useGame.getState().setTokenPos(me, 15); // punto di partenza della camminata
  g.players[0].pos = 10; // posizione finale autoritativa: il sync di fine timeline vi allinea
  choreograph(g, [
    { e: "moved", pid: me, from: 15, to: 22 },
    { e: "card", pid: me, deck: "chance", cardId: 8 },
    { e: "jailed", pid: me },
  ]);
}

export default function DevBar() {
  const [open, setOpen] = useState(true);
  return (
    <div className="fixed bottom-2 left-2 z-50 max-w-56 space-y-1 border border-border bg-popover p-2 text-popover-foreground shadow-lg">
      <button className="w-full text-left text-xs font-bold" onClick={() => setOpen(!open)}>
        🛠 dev {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="flex flex-wrap gap-1">
          {SCENARIOS.map(([label, make]) => (
            <Button key={label} size="xs" variant="outline" onClick={() => show(make())}>
              {label}
            </Button>
          ))}
          <div className="w-full pt-1 text-2xs font-bold text-muted-foreground uppercase">event card</div>
          {POPUPS.map(([label, ps]) => (
            <Button key={label} size="xs" variant="outline" onClick={() => popup(ps)}>
              🎴 {label}
            </Button>
          ))}
          <Button size="xs" variant="outline" onClick={jailTrip}>
            🎴 Pedina→carta→prigione
          </Button>
        </div>
      )}
    </div>
  );
}
