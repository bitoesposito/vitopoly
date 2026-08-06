// Verifica del dado: quanti pip ha ogni faccia, e quale faccia mostra ogni valore.
// Convenzione CSS: x a destra, y in basso, z verso l'osservatore.
import { readFileSync } from "node:fs";

const css = readFileSync("src/index.css", "utf8");

const pip = {};
for (const f of ["front", "back", "top", "bottom", "right", "left"]) {
  const blocco = css.match(new RegExp(`\\.die-${f}::after\\s*\\{([^}]*)\\}`));
  const bs = blocco && blocco[1].match(/box-shadow:\s*([^;]*)/);
  pip[f] = 1 + (bs ? bs[1].split(",").length : 0); // pip base + una copia per ogni ombra
}
console.log("pip per faccia:", pip);
for (const [a, b] of [["front", "back"], ["top", "bottom"], ["right", "left"]]) {
  const s = pip[a] + pip[b];
  console.log(`  ${a}+${b} = ${s} ${s === 7 ? "OK (facce opposte di un dado vero)" : "NON 7"}`);
}

const rad = (d) => (d * Math.PI) / 180;
const app = (M, v) => M.map((r) => r.reduce((s, x, i) => s + x * v[i], 0));
const Rx = (a) => [[1, 0, 0], [0, Math.cos(rad(a)), -Math.sin(rad(a))], [0, Math.sin(rad(a)), Math.cos(rad(a))]];
const Ry = (a) => [[Math.cos(rad(a)), 0, Math.sin(rad(a))], [0, 1, 0], [-Math.sin(rad(a)), 0, Math.cos(rad(a))]];
const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// normale di ogni faccia: la trasformazione della faccia applicata a +Z
const FACCE = { front: I, back: Rx(180), top: Rx(90), bottom: Rx(-90), right: Ry(90), left: Ry(-90) };
// DIE_FACE, da src/components/Center.tsx
const DIE_FACE = { 1: I, 2: Rx(-90), 3: Ry(90), 4: Ry(-90), 5: Rx(90), 6: Rx(180) };

console.log("\nvalore -> faccia mostrata:");
let ok = true;
for (const [val, M] of Object.entries(DIE_FACE)) {
  let best = null;
  let bz = -2;
  for (const [n, F] of Object.entries(FACCE)) {
    const z = app(M, app(F, [0, 0, 1]))[2]; // quanto quella normale punta verso l'osservatore
    if (z > bz) { bz = z; best = n; }
  }
  const giusto = pip[best] === Number(val);
  if (!giusto) ok = false;
  console.log(`  ${val} -> ${best} (${pip[best]} pip) ${giusto ? "OK" : "SBAGLIATA"}`);
}
console.log(ok ? "\nMappatura corretta." : "\nMAPPATURA ERRATA");
