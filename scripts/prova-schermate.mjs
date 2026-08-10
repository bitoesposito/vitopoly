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

// L'invito a installare ha tre stati e due sono invisibili in un browser da test: il browser
// non manda `beforeinstallprompt` a localhost senza installabilità, e "già installata" non si
// emula. Si simulano entrambi, perché la regola da verificare è proprio quando NON compare.
{
  const { page, ctx } = await apri(390, 844, true);
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await page.waitForTimeout(250);
  const riga = page.getByRole("button", { name: /Installa/ });

  assert.equal(await riga.count(), 0, "l'invito compare senza che il browser l'abbia offerto");

  await page.evaluate(() => {
    window.__chiesto = 0;
    const e = new Event("beforeinstallprompt");
    e.prompt = () => void window.__chiesto++;
    dispatchEvent(e);
  });
  await page.waitForTimeout(200);
  assert.equal(await riga.count(), 1, "il browser ha offerto l'installazione e l'invito non c'è");
  await riga.click();
  assert.equal(await page.evaluate(() => window.__chiesto), 1, "il bottone non ha aperto il dialogo del sistema");
  await page.waitForTimeout(200);
  assert.equal(await riga.count(), 0, "l'invito resta dopo essere stato speso");

  // ad app installata non deve esistere, nemmeno se il browser lo offrisse
  await page.evaluate(() => {
    const vero = matchMedia;
    window.matchMedia = (q) => (q.includes("standalone") ? { matches: true, addEventListener() {}, removeEventListener() {} } : vero(q));
  });
  await page.getByRole("button", { name: "preRoll (io)", exact: true }).click();
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt");
    e.prompt = () => {};
    dispatchEvent(e);
  });
  await page.waitForTimeout(200);
  assert.equal(await riga.count(), 0, "app installata: l'invito a installarla non deve esistere");
  await ctx.close();
}

await browser.close();

if (problemi.length) {
  console.error("schermate con errori a runtime:");
  for (const p of problemi) console.error("  -", p);
  process.exit(1);
}
console.log(
  `tutto a posto: ${SCENARI.length} scenari e ${CARTE.length + 1} carte su mobile e desktop, l'invito a installare nei suoi tre stati, senza errori a runtime`
);
