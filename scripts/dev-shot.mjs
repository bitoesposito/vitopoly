// Screenshot di uno scenario /dev su un viewport dato.
//   node scripts/dev-shot.mjs "postRoll + prop." 375 667 /tmp/se.png
import { chromium } from "playwright";
const [scenario, w, h, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:5173/dev", { waitUntil: "networkidle" });
await p.getByRole("button", { name: scenario, exact: true }).click(); // il pannello dev è già aperto
await p.waitForTimeout(1200);
// via la barra dev dallo scatto: non fa parte del gioco
await p.evaluate(() => document.querySelector(".fixed.bottom-2.left-2")?.remove());
await p.screenshot({ path: out, fullPage: false });
console.log("ok:", out);
await b.close();
