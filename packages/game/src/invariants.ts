import type { GameState } from "./types";

// Le cose che non possono MAI essere vere. I test le controllano dopo ogni apply, il
// server prima di persistere: uno stato che ne viola una non viene salvato. Restituisce
// i motivi, non un booleano — quando scatta in produzione si vuole sapere quale.
export function invariantViolations(s: GameState): string[] {
  const bad: string[] = [];
  const out = (pid: string) => s.players.find((p) => p.id === pid)?.bankrupt !== false;

  for (const p of s.players) if (p.cash < 0) bad.push(`cassa negativa: ${p.name} (${p.cash})`);

  const owned = Object.values(s.props);
  const houses = owned.reduce((n, o) => n + (o!.houses === 5 ? 0 : o!.houses), 0);
  const hotels = owned.filter((o) => o!.houses === 5).length;
  if (houses + s.bank.houses !== 32) bad.push(`case: ${houses} sul tabellone + ${s.bank.houses} in banca`);
  if (hotels + s.bank.hotels !== 12) bad.push(`hotel: ${hotels} sul tabellone + ${s.bank.hotels} in banca`);

  for (const [tile, o] of Object.entries(s.props)) if (out(o!.owner)) bad.push(`casella ${tile} di un giocatore non in partita`);

  for (const f of s.stack) {
    if (f.t === "debt" && out(f.debtor)) bad.push("debito a carico di un fallito");
    if (f.t === "auction") for (const pid of f.active) if (out(pid)) bad.push("asta con un offerente fallito");
  }

  if (s.status === "playing" && !s.players[s.current]?.id) bad.push(`turno fuori indice: ${s.current}`);
  else if (s.status === "playing" && s.players[s.current].bankrupt) bad.push("il turno è di un fallito");

  return bad;
}
