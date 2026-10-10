import { RoomDO } from "./room";

export { RoomDO };

export interface Env {
  ROOM: DurableObjectNamespace;
}

// Aperto di proposito: non c'è cookie né credenziale da rubare con una richiesta
// cross-origin. Il confine è il segreto di posto (room.ts), non l'origine.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars
// Sei caratteri, non cinque: il codice non viene riservato da nessuna parte (creare una
// stanza non tocca il Durable Object, ed è il motivo per cui una stanza mai usata non
// costa niente), quindi l'unicità è solo probabilistica — 32^6 = un miliardo, e un
// carattere in più costa meno di un registro da mantenere e da ripulire.
function makeCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(b, (x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join("");
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    // Create a room -> return a join code. The DO is created lazily on first WS connect.
    if (req.method === "POST" && url.pathname === "/api/room") {
      return Response.json({ code: makeCode() }, { headers: CORS });
    }

    // WebSocket into a room (+ debug state dump).
    const m = url.pathname.match(/^\/api\/room\/([a-z0-9]+)\/(ws|debug)$/i);
    if (m) {
      const id = env.ROOM.idFromName(m[1].toLowerCase());
      return env.ROOM.get(id).fetch(req);
    }

    return new Response("not found", { status: 404, headers: CORS });
  },
};
