// Screenshot di una partita vera: due giocatori (uno desktop, uno telefono),
// match avviato, dadi in volo e posati.
//   node scripts/shot.mjs [outDir]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "/tmp/shots";
const URL = "http://localhost:5173";
mkdirSync(OUT, { recursive: true });

const errs = [];
const watch = (p, who) => {
  p.on("console", (m) => m.type() === "error" && errs.push(`[${who}] ${m.text()}`));
  p.on("pageerror", (e) => errs.push(`[${who}] ${e.message}`));
};

const b = await chromium.launch();
const host = await (await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })).newPage();
const mob = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
watch(host, "host");
watch(mob, "mobile");

await host.goto(URL, { waitUntil: "networkidle" });
await host.screenshot({ path: `${OUT}/1-lobby-desktop.png` });
await host.fill("#nome", "Vito");
await host.getByRole("button", { name: /crea la stanza/i }).click();
await host.waitForFunction(() => new URLSearchParams(location.search).get("room"), null, { timeout: 20000 });
const code = await host.evaluate(() => new URLSearchParams(location.search).get("room"));
await host.waitForTimeout(600);
await host.screenshot({ path: `${OUT}/2-prematch-desktop.png`, fullPage: true });

// il telefono entra PRIMA dell'avvio: deve essere un giocatore, non uno spettatore
await mob.goto(`${URL}/?room=${code}`, { waitUntil: "networkidle" });
await mob.screenshot({ path: `${OUT}/6-lobby-mobile.png` });
await mob.fill("#nome", "Anna");
await mob.getByRole("button", { name: /entra nel giro/i }).click();
await host.waitForTimeout(1200);

await host.getByRole("button", { name: /inizia partita/i }).click();
await host.waitForTimeout(2500);
await host.screenshot({ path: `${OUT}/3-board-desktop.png` });
await mob.screenshot({ path: `${OUT}/7-board-mobile.png` });
await mob.screenshot({ path: `${OUT}/8-mobile-full.png`, fullPage: true });

const board = host.locator("main .grid.aspect-square").first();
if (await board.count()) await board.screenshot({ path: `${OUT}/4-board-only.png` });

// tira i dadi: l'ordine di turno è sorteggiato, tira chi ce l'ha
const chiTira = (await host.getByRole("button", { name: /tira i dadi/i }).count()) ? host : mob;
const roll = chiTira.getByRole("button", { name: /tira i dadi/i });
if (await roll.count()) {
  await roll.first().click();
  await chiTira.waitForTimeout(330); // in volo
  await chiTira.locator(".dice-tray").first().screenshot({ path: `${OUT}/5a-dadi-in-volo.png` });
  await chiTira.waitForTimeout(1900);
  await chiTira.locator(".dice-tray").first().screenshot({ path: `${OUT}/5b-dadi-posati.png` });
  await chiTira.screenshot({ path: `${OUT}/5-dopo-tiro.png` });
  // compra, così i talloncini hanno contenuto reale da fotografare
  const compra = chiTira.getByRole("button", { name: /^compra$/i });
  if (await compra.count()) {
    await compra.first().click();
    await chiTira.waitForTimeout(1500);
    await chiTira.screenshot({ path: `${OUT}/9-con-proprieta.png` });
  }
}

console.log("codice stanza:", code, "| turno a:", chiTira === host ? "desktop" : "mobile");
console.log("errori console:", errs.length ? errs.slice(0, 12) : "nessuno");
await b.close();
