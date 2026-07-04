import { RoomDO } from "./room";

export { RoomDO };

export interface Env {
  ROOM: DurableObjectNamespace;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars
function makeCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(5));
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
