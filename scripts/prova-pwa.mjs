// L'app è installabile e si apre senza rete. Non è verificabile in sviluppo: il worker si
// registra solo in produzione, quindi questa prova vuole il build servito.
//   pnpm build && pnpm preview --port 4173
//   node scripts/prova-pwa.mjs
//   URL=https://... node scripts/prova-pwa.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";

const URL_BASE = process.env.URL ?? "http://localhost:4173";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const problemi = [];
page.on("pageerror", (e) => problemi.push(`eccezione — ${e.message}`));

// --- il manifest, come lo legge il browser -----------------------------------------
await page.goto(URL_BASE, { waitUntil: "networkidle" });
const href = await page.getAttribute('link[rel="manifest"]', "href");
assert.ok(href, "manca <link rel=manifest>");
const man = await (await page.request.get(new URL(href, URL_BASE).href)).json();
for (const campo of ["name", "short_name", "start_url", "display", "icons", "theme_color", "background_color"]) {
  assert.ok(man[campo], `manifest senza ${campo}`);
}
assert.equal(man.display, "standalone");
// i due gradini che Android chiede, più la variante ritagliabile
const misure = man.icons.map((i) => `${i.sizes} ${i.purpose ?? "any"}`);
assert.ok(misure.includes("192x192 any") && misure.includes("512x512 any"), `icone insufficienti: ${misure}`);
assert.ok(
  man.icons.some((i) => i.purpose === "maskable"),
  "manca l'icona maskable: su Android il ritaglio mangerebbe il marchio"
);
for (const i of man.icons) {
  const r = await page.request.get(new URL(i.src, URL_BASE).href);
  assert.equal(r.status(), 200, `icona non servita: ${i.src}`);
}
// iOS non guarda il manifest per l'icona in home
const apple = await page.getAttribute('link[rel="apple-touch-icon"]', "href");
assert.ok(apple && (await page.request.get(new URL(apple, URL_BASE).href)).status() === 200, "apple-touch-icon assente");

// --- il worker prende il controllo ---------------------------------------------------
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });
const inCache = await page.evaluate(async () => {
  const c = await caches.open("tangentopoly");
  return (await c.keys()).map((r) => new URL(r.url).pathname);
});
assert.ok(inCache.includes("/"), `il guscio non è in cache: ${inCache}`);
assert.ok(
  inCache.some((p) => p.startsWith("/assets/") && p.endsWith(".js")),
  `gli asset del guscio non sono in cache: ${inCache}`
);

// --- e senza rete l'app si apre comunque ---------------------------------------------
await ctx.setOffline(true);
await page.goto(URL_BASE, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.getElementById("root")?.childElementCount > 0, null, { timeout: 15_000 });
const testo = await page.locator("#root").innerText();
assert.ok(testo.trim().length > 0, "offline: #root è rimasto vuoto");
await ctx.setOffline(false);

assert.deepEqual(problemi, [], `errori a runtime:\n${problemi.join("\n")}`);
await browser.close();
console.log(`tutto a posto: manifest, ${man.icons.length} icone, worker attivo, ${inCache.length} file in cache, e si apre offline`);
