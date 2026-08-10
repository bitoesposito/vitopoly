// Service worker minimo, e minimo è il punto: il gioco è in tempo reale su WebSocket, così
// offline non si gioca e nessuna cache lo cambierà. Serve a due cose sole — un handler di
// fetch è il requisito che rende l'app installabile, e l'app installata deve APRIRSI anche
// senza rete, dove mostra il suo banner di riconnessione invece della pagina d'errore del
// browser. Niente workbox: non c'è niente da orchestrare.

const CACHE = "tangentopoly";
const GUSCIO = "/"; // la SPA ha una pagina sola: ogni navigazione riparte da qui

// ignoreVary NON è un dettaglio: Vite marca i suoi script `crossorigin`, quindi il browser
// li chiede con un header Origin e il server risponde `Vary: Origin`. Senza questo la cache
// confronta il Vary, non trova quello che il worker ha salvato (che Origin non lo manda) e
// l'app offline resta una pagina bianca. L'URL porta l'hash del contenuto: decide tutto lui.
const TROVA = { ignoreVary: true };

/** I file di build si chiamano `nome-HASH.ext`. Tenendo una sola generazione per nome, la
 *  cache non cresce di una copia a ogni deploy. Solo sotto /assets/, dove l'hash esiste:
 *  altrove due nomi diversi sono due file diversi (icona-192 e icona-512). */
const famiglia = (u) => u.replace(/-[^-/.]+(\.[a-z0-9]+)$/i, "$1");

async function conserva(req, res) {
  if (!res.ok) return res;
  const cache = await caches.open(CACHE);
  if (req.url.includes("/assets/")) {
    for (const vecchio of await cache.keys()) {
      if (vecchio.url !== req.url && famiglia(vecchio.url) === famiglia(req.url)) await cache.delete(vecchio);
    }
  }
  await cache.put(req, res.clone());
  return res;
}

// L'installazione mette in cache il guscio e i suoi asset. Serve perché la navigazione che
// ha caricato la pagina è avvenuta PRIMA che questo worker prendesse il controllo: senza
// pre-carico, chi installa e va offline subito troverebbe il vuoto. La lista degli asset la
// dice l'html: è già il manifest del build, non serve generarne un altro.
self.addEventListener("install", (e) =>
  e.waitUntil(
    (async () => {
      self.skipWaiting();
      const cache = await caches.open(CACHE);
      const res = await fetch(GUSCIO, { cache: "reload" });
      const html = await res.clone().text();
      await cache.put(GUSCIO, res);
      const asset = [...html.matchAll(/["'](\/assets\/[^"']+)["']/g)].map((m) => m[1]);
      await cache.addAll(asset).catch(() => {}); // un file che manca non deve costare l'installazione
    })()
  )
);

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // il server del gioco sta su un'altra origine, e i WebSocket non passano da qui
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (req.mode === "navigate") {
    // prima la rete: un deploy nuovo si vede al primo caricamento con rete, non al secondo
    e.respondWith(
      fetch(req)
        .then(async (res) => {
          (await caches.open(CACHE)).put(GUSCIO, res.clone()); // il guscio è uno, qualunque URL lo aggiorni
          return res;
        })
        .catch(async () => (await caches.match(GUSCIO, TROVA)) ?? Response.error())
    );
    return;
  }

  if (req.url.includes("/assets/")) {
    // hash nel nome = contenuto immutabile: se c'è, è quello giusto
    e.respondWith(caches.match(req, TROVA).then((hit) => hit ?? fetch(req).then((res) => conserva(req, res))));
    return;
  }

  // icone, manifest, favicon: si servono da cache e si aggiornano dietro, così una
  // sostituzione arriva al secondo avvio invece di non arrivare mai
  e.respondWith(
    caches.match(req, TROVA).then((hit) => {
      const fresco = fetch(req)
        .then((res) => conserva(req, res))
        .catch(() => hit ?? Response.error());
      if (!hit) return fresco;
      e.waitUntil(fresco); // senza questo il worker può morire prima di aver aggiornato
      return hit;
    })
  );
});
