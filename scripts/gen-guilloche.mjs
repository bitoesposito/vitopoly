// Campo guilloche autoriale: rosette parametriche (somma di due rotazioni, come un
// tornio a ghigliosce). Una curva per famiglia + <use> ruotati: lo sfasamento di una
// rosetta a k intero È una rotazione della stessa curva, quindi il moiré si ottiene
// senza ripetere le coordinate 30 volte (1 MB -> ~21 KB).
//
//   node scripts/gen-guilloche.mjs public/guilloche.svg
import { writeFileSync } from "node:fs";

const S = 600;
const C = S / 2;

function rosette(R, r, k, steps) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = C + R * Math.cos(t) + r * Math.cos(k * t);
    const y = C + R * Math.sin(t) + r * Math.sin(k * t);
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
}

const FAM = [
  { id: "a", d: rosette(150, 78, 7, 560), n: 14 },
  { id: "b", d: rosette(96, 52, 11, 620), n: 10 },
  { id: "c", d: rosette(215, 34, 5, 480), n: 8 },
];

const uses = FAM.flatMap(({ id, n }) =>
  Array.from({ length: n }, (_, i) => `<use href="#${id}" transform="rotate(${((360 / n) * i).toFixed(2)} ${C} ${C})"/>`),
).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<defs>${FAM.map(({ id, d }) => `<path id="${id}" d="${d}"/>`).join("")}</defs>
<g fill="none" stroke="#e9e2d2" stroke-width="0.45" stroke-opacity="0.14">${uses}</g>
</svg>
`;

writeFileSync(process.argv[2], svg);
console.log("KB:", (svg.length / 1024).toFixed(1));
