// Tabella dei contrasti reali del tema, calcolata dai token di src/index.css.
// Serve a tarare la palette con i numeri invece che a occhio.
//   node scripts/contrasti.mjs
import { readFileSync } from "node:fs";

const css = readFileSync("src/index.css", "utf8");
const tok = (n) => {
  const m = css.match(new RegExp(`--${n}:\\s*([^;]+);`));
  return m && m[1].trim();
};

const srgb = (x) => {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, v));
};
function oklch(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    srgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    srgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    srgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const Y = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const parse = (v) => {
  if (!v) return null;
  if (v.startsWith("#")) return hex(v);
  const m = v.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  return m ? oklch(+m[1], +m[2], +m[3]) : null;
};
const ratio = (a, b) => {
  const [h, l] = a > b ? [a, b] : [b, a];
  return (h + 0.05) / (l + 0.05);
};
const y = (n) => Y(parse(tok(n)));
const r = (a, b) => ratio(y(a), y(b)).toFixed(2);

const righe = [
  ["SUPERFICI", null],
  ["carta vs scrivania (il salto al bordo plancia)", r("paper", "background")],
  ["carta vs pannello", r("paper", "card")],
  ["pannello vs scrivania", r("card", "background")],
  ["TESTO SU SCURO (serve 4.5)", null],
  ["foreground su card", r("foreground", "card")],
  ["muted-foreground su card", r("muted-foreground", "card")],
  ["muted-foreground su background", r("muted-foreground", "background")],
  ["TESTO SU CARTA (serve 4.5)", null],
  ["paper-ink su carta", r("paper-ink", "paper")],
  ["sanguigna-carta su carta", r("sanguigna-carta", "paper")],
  ["indaco-carta su carta", r("indaco-carta", "paper")],
  ["verde-carta su carta", r("verde-carta", "paper")],
  ["bollo-carta su carta", r("bollo-carta", "paper")],
];
for (const [n, v] of righe) {
  if (v === null) console.log(`\n${n}`);
  else console.log(`  ${v.padStart(6)}  ${n}${+v < 4.5 && n.includes("su carta") ? "  <-- SOTTO" : ""}`);
}

// bande di serie: elementi non testuali, soglia 3
const bande = css.includes("GROUP") ? null : null;
void bande;
const colors = readFileSync("src/lib/colors.ts", "utf8");
console.log("\nBANDE DI SERIE su carta (serve 3.0)");
for (const m of colors.matchAll(/(\w+): "(#[0-9a-f]{6})", \/\/ (\w+)/g)) {
  const v = ratio(y("paper"), Y(hex(m[2]))).toFixed(2);
  console.log(`  ${v.padStart(6)}  ${m[3]}${+v < 3 ? "  <-- SOTTO" : ""}`);
}
