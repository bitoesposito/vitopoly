// I raster delle icone PWA, dagli SVG in public/. Il manifest vuole PNG (iOS non guarda
// altro, e su Android il supporto SVG è a chiazze), ma la fonte resta vettoriale: qui si
// rasterizza, non si ridisegna.
//   node scripts/icone.mjs
// Chromium arriva da playwright, che è già una dipendenza di sviluppo: niente sharp.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// [sorgente, misura, uscita] — 192 e 512 sono i due gradini che Android chiede, il
// maskable è la variante col margine di sicurezza, 180 è l'icona di iOS.
const ICONE = [
  ["icona.svg", 192, "icona-192.png"],
  ["icona.svg", 512, "icona-512.png"],
  ["icona-maskable.svg", 512, "icona-maskable-512.png"],
  ["icona.svg", 180, "apple-touch-icon.png"],
];

const browser = await chromium.launch();
for (const [src, size, out] of ICONE) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // l'SVG inline a tutta pagina: niente margini del documento, niente fondo del browser
  await page.setContent(
    `<style>html,body{margin:0;width:${size}px;height:${size}px}svg{display:block;width:100%;height:100%}</style>` +
      readFileSync(join(PUBLIC, src), "utf8")
  );
  await page.screenshot({ path: join(PUBLIC, out), omitBackground: true });
  await page.close();
  console.log(`${out} ${size}×${size} ← ${src}`);
}
await browser.close();
