// Le schermate si aprono davvero, in un browser vero, senza errori a runtime.
// typecheck e test non vedono un ordine di hook sbagliato, un portal che non c'è, un
// null dereferenziato al render: quelli si vedono solo montando la pagina.
//   node scripts/prova-schermate.mjs            (serve `pnpm serve` acceso)
//   URL=http://localhost:5173 node scripts/prova-schermate.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";

const URL = process.env.URL ?? "http://localhost:5173";

// Ogni scenario del pannello /dev: sono gli stati che il motore sa produrre.
const SCENARI = [
  "Home",
  "Impostazioni",
  "preRoll (io)",
  "preRoll (altro)",
  "buyPrompt",
  "buyPrompt (a secco)",
  "postRoll + prop.",
  "Asta",
  "Debito",
  "Trade in arrivo",
  "In prigione",
  "Timer",
  "Fine partita",
];

// Le carte evento hanno una loro animazione e un loro ciclo di vita: valgono un giro.
const CARTE = ["Blitz", "Favori", "Prigione", "Acquisto", "Scambio", "Sequenza"];

const browser = await chromium.launch();
const problemi = [];

async function apri(width, height, mobile) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const dove = mobile ? "mobile" : "desktop";
  page.on("pageerror", (e) => problemi.push(`${dove}: eccezione non gestita — ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // il favicon assente in dev non è un difetto del gioco
    if (/favicon|net::ERR_/i.test(m.text())) return;
    problemi.push(`${dove}: console.error — ${m.text()}`);
  });
  await page.goto(`${URL}/dev`, { waitUntil: "networkidle" });
  return { page, ctx, dove };
}

for (const [w, h, mobile] of [
  [390, 844, true],
  [1440, 900, false],
]) {
  const { page, ctx, dove } = await apri(w, h, mobile);

  for (const scenario of SCENARI) {
    await page.getByRole("button", { name: scenario, exact: true }).click();
    await page.waitForTimeout(250);
    // la pagina deve avere ancora un contenuto: uno schianto al render lascia #root vuoto
    const vuoto = await page.evaluate(() => document.getElementById("root")?.childElementCount === 0);
    assert.equal(vuoto, false, `${dove}/${scenario}: #root è rimasto vuoto`);
  }

  for (const carta of CARTE) {
    await page.getByRole("button", { name: `🎴 ${carta}`, exact: true }).click();
    await page.waitForTimeout(200);
  }
  await page.getByRole("button", { name: "🎴 Pedina→carta→prigione", exact: true }).click();
  await page.waitForTimeout(1800); // la coreografia ha una linea del tempo: lasciala finire

  // la zona pollice è fuori da React: se il portal non trova il contenitore, sparisce
  if (mobile) {
    await page.getByRole("button", { name: "preRoll (io)", exact: true }).click();
    await page.waitForTimeout(300);
    const azioni = await page.locator("#barra-azione button").count();
    assert.ok(azioni > 0, "mobile: la barra pollice è vuota, il portal non ha agganciato");
  }

  await ctx.close();
}

await browser.close();

if (problemi.length) {
  console.error("schermate con errori a runtime:");
  for (const p of problemi) console.error("  -", p);
  process.exit(1);
}
console.log(`tutto a posto: ${SCENARI.length} scenari e ${CARTE.length + 1} carte, su mobile e desktop, senza errori a runtime`);
