import { beforeEach, describe, expect, it, vi } from "vitest";
import { myId, rememberSeat, seatSecret, transferLink } from "./seat";

// Il link di trasferimento è una credenziale al portatore: questi test dicono che viene
// consumata una volta sola e che non resta nella barra degli indirizzi.

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal("crypto", { randomUUID: () => "pid-nuovo" });
  visit("/gioca");
});

function visit(url: string) {
  const full = new URL(url, "https://tangentopoly.test");
  const replaced: string[] = [];
  vi.stubGlobal("location", { href: full.href, origin: full.origin, pathname: full.pathname, search: full.search });
  vi.stubGlobal("history", { replaceState: (_a: unknown, _b: unknown, u: string) => replaced.push(u) });
  return replaced;
}

describe("identità del posto", () => {
  it("senza link né memoria, ne conia una nuova e la ricorda", () => {
    expect(myId()).toBe("pid-nuovo");
    expect(store.get("tangentopoly:pid")).toBe("pid-nuovo");
  });

  it("con una memoria esistente la riusa, senza coniare", () => {
    store.set("tangentopoly:pid", "pid-vecchio");
    expect(myId()).toBe("pid-vecchio");
  });

  it("un link di trasferimento adotta pid e segreto", () => {
    visit("/gioca?room=abc12&pid=pid-vito&seat=segreto-vito");
    expect(myId()).toBe("pid-vito");
    expect(store.get("tangentopoly:pid")).toBe("pid-vito");
    expect(seatSecret("abc12")).toBe("segreto-vito");
  });

  it("il segreto sparisce dall'URL, la stanza resta", () => {
    const replaced = visit("/gioca?room=abc12&pid=pid-vito&seat=segreto-vito");
    myId();
    expect(replaced).toHaveLength(1);
    expect(replaced[0]).toBe("/gioca?room=abc12");
    expect(replaced[0]).not.toContain("seat");
    expect(replaced[0]).not.toContain("pid");
  });

  it("un link monco non adotta niente: serve la terna completa", () => {
    for (const url of ["/gioca?room=abc12&pid=x", "/gioca?room=abc12&seat=y", "/gioca?pid=x&seat=y"]) {
      store.clear();
      visit(url);
      expect(myId()).toBe("pid-nuovo");
    }
  });

  it("il link di trasferimento porta stanza, pid e segreto — e non è il link d'invito", () => {
    rememberSeat("abc12", "segreto-vito");
    const link = transferLink("abc12", "pid-vito");
    expect(link).toBe("https://tangentopoly.test/gioca?room=abc12&pid=pid-vito&seat=segreto-vito");
    // l'invito che si condivide col gruppo resta la sola `?room=`
    expect(`${location.origin}${location.pathname}?room=abc12`).not.toContain("seat");
  });

  it("i segreti sono per stanza: uno non apre l'altra", () => {
    rememberSeat("abc12", "uno");
    rememberSeat("zz999", "due");
    expect(seatSecret("abc12")).toBe("uno");
    expect(seatSecret("zz999")).toBe("due");
    expect(seatSecret("mai-vista")).toBe("");
  });
});
