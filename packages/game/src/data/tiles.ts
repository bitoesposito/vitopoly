// The 40 tiles as static data. The ONE place tile semantics live.

export type TileKind = "go" | "street" | "railroad" | "utility" | "tax" | "chance" | "chest" | "jail" | "gotojail" | "parking";

export interface TileDef {
  name: string;
  kind: TileKind;
  price?: number; // street / railroad / utility
  group?: string; // color group for streets
  rent?: number[]; // [base, 1h, 2h, 3h, 4h, hotel]
  houseCost?: number; // per house/hotel
  taxAmount?: number; // tax tiles
}

export const JAIL = 10;
export const GO_SALARY = 200;
export const BAIL = 50;

// Tema Tangentopoli: un set colore = una regione, in scalata di malaffare —
// dalla provincia di Foggia alla Milano di Mani Pulite. Gioco monolingua:
// i nomi sono direttamente in italiano (display + chiavi dei `why` tipo "buy X").
export const BOARD: readonly TileDef[] = [
  { name: "VIA", kind: "go" },
  { name: "Foggia", kind: "street", price: 60, group: "brown", houseCost: 50, rent: [2, 10, 30, 90, 160, 250] }, // Puglia
  { name: "Favori", kind: "chest" },
  { name: "Trani", kind: "street", price: 60, group: "brown", houseCost: 50, rent: [4, 20, 60, 180, 320, 450] },
  { name: "Tangente", kind: "tax", taxAmount: 200 },
  { name: "Poste Italiane", kind: "railroad", price: 200 }, // "railroad" = partecipate di Stato
  { name: "Crotone", kind: "street", price: 100, group: "lightblue", houseCost: 50, rent: [6, 30, 90, 270, 400, 550] }, // Calabria
  { name: "Blitz", kind: "chance" },
  { name: "Vibo Valentia", kind: "street", price: 100, group: "lightblue", houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { name: "Reggio Calabria", kind: "street", price: 120, group: "lightblue", houseCost: 50, rent: [8, 40, 100, 300, 450, 600] },
  { name: "In Prigione", kind: "jail" },
  { name: "Caserta", kind: "street", price: 140, group: "pink", houseCost: 100, rent: [10, 50, 150, 450, 625, 750] }, // Campania
  { name: "Autostrade", kind: "utility", price: 150 }, // "utility" = concessioni: rendita a consumo (dadi)
  { name: "Salerno", kind: "street", price: 140, group: "pink", houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { name: "Napoli", kind: "street", price: 160, group: "pink", houseCost: 100, rent: [12, 60, 180, 500, 700, 900] },
  { name: "INPS", kind: "railroad", price: 200 },
  { name: "Gela", kind: "street", price: 180, group: "orange", houseCost: 100, rent: [14, 70, 200, 550, 750, 950] }, // Sicilia
  { name: "Favori", kind: "chest" },
  { name: "Catania", kind: "street", price: 180, group: "orange", houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { name: "Palermo", kind: "street", price: 200, group: "orange", houseCost: 100, rent: [16, 80, 220, 600, 800, 1000] },
  { name: "Latitanza", kind: "parking" },
  { name: "Latina", kind: "street", price: 220, group: "red", houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] }, // Lazio
  { name: "Blitz", kind: "chance" },
  { name: "Ostia", kind: "street", price: 220, group: "red", houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { name: "Roma", kind: "street", price: 240, group: "red", houseCost: 150, rent: [20, 100, 300, 750, 925, 1100] },
  { name: "Enel", kind: "railroad", price: 200 },
  { name: "Mestre", kind: "street", price: 260, group: "yellow", houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] }, // Veneto
  { name: "Verona", kind: "street", price: 260, group: "yellow", houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { name: "Equitalia", kind: "utility", price: 150 },
  { name: "Venezia", kind: "street", price: 280, group: "yellow", houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200] },
  { name: "Mani Pulite", kind: "gotojail" },
  { name: "Savona", kind: "street", price: 300, group: "green", houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] }, // Liguria
  { name: "Sanremo", kind: "street", price: 300, group: "green", houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { name: "Favori", kind: "chest" },
  { name: "Genova", kind: "street", price: 320, group: "green", houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
  { name: "RAI", kind: "railroad", price: 200 },
  { name: "Blitz", kind: "chance" },
  { name: "Brescia", kind: "street", price: 350, group: "darkblue", houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500] }, // Lombardia
  { name: "Mazzetta", kind: "tax", taxAmount: 100 },
  { name: "Milano", kind: "street", price: 400, group: "darkblue", houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

export function groupTiles(group: string): number[] {
  return BOARD.flatMap((t, i) => (t.group === group ? [i] : []));
}

/** Il giro completo. Il tabellone è un anello: ogni conto di caselle passa da qui,
 *  invece di ripetere `40` in sette punti fra motore e interfaccia. */
export const TILES = BOARD.length;

/** Passi da `from` a `to` andando in avanti (l'unico verso in cui si muove una pedina). */
export const stepsTo = (from: number, to: number): number => (to - from + TILES) % TILES;

/** La casella `n` passi indietro rispetto a `from`. */
export const stepsBack = (from: number, n: number): number => (from - n + TILES) % TILES;
