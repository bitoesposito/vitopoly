import type { GameState } from "./types";

// Le cose che non possono MAI essere vere. I test le controllano dopo ogni apply, il
// server prima di persistere: uno stato che ne viola una non viene salvato. Restituisce
// i motivi, non un booleano — quando scatta in produzione si vuole sapere quale.
export function violazioni(s: GameState): string[] {
  const fuori: string[] = [];
  const fallito = (pid: string) => s.players.find((p) => p.id === pid)?.bankrupt !== false;

  for (const p of s.players) if (p.cash < 0) fuori.push(`cassa negativa: ${p.name} (${p.cash})`);

  const edifici = Object.values(s.props);
  const case_ = edifici.reduce((n, o) => n + (o!.houses === 5 ? 0 : o!.houses), 0);
  const hotel = edifici.filter((o) => o!.houses === 5).length;
  if (case_ + s.bank.houses !== 32) fuori.push(`case: ${case_} sul tabellone + ${s.bank.houses} in banca`);
  if (hotel + s.bank.hotels !== 12) fuori.push(`hotel: ${hotel} sul tabellone + ${s.bank.hotels} in banca`);

  for (const [tile, o] of Object.entries(s.props)) if (fallito(o!.owner)) fuori.push(`casella ${tile} di un giocatore non in partita`);

  for (const f of s.stack) {
    if (f.t === "debt" && fallito(f.debtor)) fuori.push("debito a carico di un fallito");
    if (f.t === "auction") for (const pid of f.active) if (fallito(pid)) fuori.push("asta con un offerente fallito");
  }

  if (s.status === "playing" && !s.players[s.current]?.id) fuori.push(`turno fuori indice: ${s.current}`);
  else if (s.status === "playing" && s.players[s.current].bankrupt) fuori.push("il turno è di un fallito");

  return fuori;
}
