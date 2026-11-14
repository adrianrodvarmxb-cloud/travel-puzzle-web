// REQ-3540: ante un fallo de D1, una URL vieja no responde 200; el resto sigue como hoy.
// npx vitest run src/destinations/lib/fallo-de-base.test.ts
import { describe, expect, it } from "vitest";
import { planDestinationsRequest } from "./request-plan";
import { FalloDeBase, INTENTOS_D1, RETRY_AFTER_SEGUNDOS, decidirConReintento, esUrlVieja, respuestaAnteFalloDeBase } from "./fallo-de-base";

const plan = (path: string, search = "") => planDestinationsRequest(path, new URLSearchParams(search))!;

describe("REQ-3540: un fallo de base no es «no existe»", () => {
  it("REQ-3540: /tours/{id} y /tours?countryId= son URL viejas; ante un fallo responden 503 con Retry-After", () => {
    for (const p of [plan("/tours/cmvuuv0qz0000psp7xrmovnmv"), plan("/tours", "countryId=7")]) {
      expect(esUrlVieja(p)).toBe(true);
      expect(respuestaAnteFalloDeBase(p)).toEqual({ status: 503, retryAfter: RETRY_AFTER_SEGUNDOS });
    }
  });

  it("REQ-3540: las páginas reales siguen sirviéndose ante un fallo (no se tumba el sitio)", () => {
    for (const p of [plan("/viajes/mexico/teotihuacan"), plan("/destinos/hu/budapest/free-tour-de-budapest"), plan("/sitemap-tours-mx.xml")]) {
      expect(esUrlVieja(p)).toBe(false);
      expect(respuestaAnteFalloDeBase(p)).toBeNull();
    }
  });

  it("REQ-3540: se reintenta una sola vez antes de rendirse", () => {
    expect(INTENTOS_D1).toBe(2);
  });

  it("REQ-3540: FalloDeBase conserva la causa y se distingue de cualquier otro error", () => {
    const causa = new Error("D1 DB is overloaded");
    const e = new FalloDeBase(causa);
    expect(e).toBeInstanceOf(FalloDeBase);
    expect(e.causa).toBe(causa);
    expect(e.message).toContain("D1 DB is overloaded");
  });
});

describe("REQ-3540: reintento y respuesta final", () => {
  const vieja = plan("/tours/ck1");
  const pagina = plan("/viajes/mexico/teotihuacan");

  it("REQ-3540: si el primer intento falla y el segundo funciona, se usa el resultado bueno", async () => {
    let n = 0;
    const r = await decidirConReintento(vieja, async () => {
      if (++n === 1) throw new FalloDeBase(new Error("D1 DB is overloaded"));
      return "decision";
    });
    expect(r).toEqual({ ok: true, valor: "decision" });
    expect(n).toBe(2);
  });

  it("REQ-3540: si falla las dos veces, una URL vieja responde 503 y se conserva la causa", async () => {
    let n = 0;
    const r = await decidirConReintento(vieja, async () => { n++; throw new FalloDeBase(new Error("D1 DB is overloaded")); });
    expect(n).toBe(INTENTOS_D1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.respuesta).toEqual({ status: 503, retryAfter: RETRY_AFTER_SEGUNDOS });
      expect((r.causa as Error).message).toBe("D1 DB is overloaded");
    }
  });

  it("REQ-3540: si falla las dos veces en una página real, la petición sigue como hoy (sin 503)", async () => {
    const r = await decidirConReintento(pagina, async () => { throw new FalloDeBase(new Error("D1")); });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.respuesta).toBeNull();
  });

  it("REQ-3540: no reintenta cuando el primer intento funciona", async () => {
    let n = 0;
    await decidirConReintento(vieja, async () => { n++; return null; });
    expect(n).toBe(1);
  });
});
