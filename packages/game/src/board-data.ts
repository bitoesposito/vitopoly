// The 40 tiles as static data. The ONE place tile semantics live.

export type TileKind =
  | "go"
  | "street"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "chest"
  | "jail"
  | "gotojail"
  | "parking";

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

export const BOARD: readonly TileDef[] = [
  { name: "GO", kind: "go" },
  { name: "Mediterranean Ave", kind: "street", price: 60, group: "brown", houseCost: 50, rent: [2, 10, 30, 90, 160, 250] },
  { name: "Community Chest", kind: "chest" },
  { name: "Baltic Ave", kind: "street", price: 60, group: "brown", houseCost: 50, rent: [4, 20, 60, 180, 320, 450] },
  { name: "Income Tax", kind: "tax", taxAmount: 200 },
  { name: "Reading Railroad", kind: "railroad", price: 200 },
  { name: "Oriental Ave", kind: "street", price: 100, group: "lightblue", houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { name: "Chance", kind: "chance" },
  { name: "Vermont Ave", kind: "street", price: 100, group: "lightblue", houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { name: "Connecticut Ave", kind: "street", price: 120, group: "lightblue", houseCost: 50, rent: [8, 40, 100, 300, 450, 600] },
  { name: "Jail", kind: "jail" },
  { name: "St. Charles Place", kind: "street", price: 140, group: "pink", houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { name: "Electric Company", kind: "utility", price: 150 },
  { name: "States Ave", kind: "street", price: 140, group: "pink", houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { name: "Virginia Ave", kind: "street", price: 160, group: "pink", houseCost: 100, rent: [12, 60, 180, 500, 700, 900] },
  { name: "Pennsylvania Railroad", kind: "railroad", price: 200 },
  { name: "St. James Place", kind: "street", price: 180, group: "orange", houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { name: "Community Chest", kind: "chest" },
  { name: "Tennessee Ave", kind: "street", price: 180, group: "orange", houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { name: "New York Ave", kind: "street", price: 200, group: "orange", houseCost: 100, rent: [16, 80, 220, 600, 800, 1000] },
  { name: "Free Parking", kind: "parking" },
  { name: "Kentucky Ave", kind: "street", price: 220, group: "red", houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { name: "Chance", kind: "chance" },
  { name: "Indiana Ave", kind: "street", price: 220, group: "red", houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { name: "Illinois Ave", kind: "street", price: 240, group: "red", houseCost: 150, rent: [20, 100, 300, 750, 925, 1100] },
  { name: "B&O Railroad", kind: "railroad", price: 200 },
  { name: "Atlantic Ave", kind: "street", price: 260, group: "yellow", houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { name: "Ventnor Ave", kind: "street", price: 260, group: "yellow", houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { name: "Water Works", kind: "utility", price: 150 },
  { name: "Marvin Gardens", kind: "street", price: 280, group: "yellow", houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200] },
  { name: "Go To Jail", kind: "gotojail" },
  { name: "Pacific Ave", kind: "street", price: 300, group: "green", houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { name: "North Carolina Ave", kind: "street", price: 300, group: "green", houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { name: "Community Chest", kind: "chest" },
  { name: "Pennsylvania Ave", kind: "street", price: 320, group: "green", houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
  { name: "Short Line Railroad", kind: "railroad", price: 200 },
  { name: "Chance", kind: "chance" },
  { name: "Park Place", kind: "street", price: 350, group: "darkblue", houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
  { name: "Luxury Tax", kind: "tax", taxAmount: 100 },
  { name: "Boardwalk", kind: "street", price: 400, group: "darkblue", houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

export function groupTiles(group: string): number[] {
  return BOARD.flatMap((t, i) => (t.group === group ? [i] : []));
}
