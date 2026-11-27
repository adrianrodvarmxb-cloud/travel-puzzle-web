// REQ-3540 (INC-015): si D1 falla, la decisión del middleware deja pasar el error en vez de devolver null.
// npx vitest run src/destinations/fallo-de-base-edge.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decideDestinationsRequest } from "./edge";
import type { DestinationsRepo, TourPlaceRow } from "./repository";
import { FalloDeBase } from "./lib/fallo-de-base";

const place = (over: Partial<TourPlaceRow> = {}): TourPlaceRow => ({
  id: "ck1", slug: "centro-historico", status: "active", title: "Centro Histórico", countrySlug: "mx", citySlug: "ciudad-de-mexico", cityName: "Ciudad de México", cityLive: true, ...over,
});
const repo = (over: Partial<DestinationsRepo> = {}): DestinationsRepo => ({
  countries: async () => [], cities: async () => [], tours: async () => [], trips: async () => [],
  tourPlaceById: async () => null, tourPlaceBySlug: async () => null, countrySlugWithTours: async () => null,
  tripBySlug: async () => null, citiesOf: async () => [], ...over,
});
const go = (path: string, r: DestinationsRepo, search = "") => decideDestinationsRequest(path, new URLSearchParams(search), { repo: r, tripVisible: () => true });

const revienta = () => { throw new Error("D1 DB is overloaded"); };

describe("REQ-3540: la decisión no se traga el fallo de D1", () => {
  it("REQ-3540: si la consulta de la URL vieja falla, lanza FalloDeBase con la causa (antes devolvía null y la URL daba 200)", async () => {
    await expect(go("/tours/ck1", repo({ tourPlaceById: revienta }))).rejects.toBeInstanceOf(FalloDeBase);
    await expect(go("/tours/ck1", repo({ tourPlaceById: revienta }))).rejects.toThrow(/D1 DB is overloaded/);
  });

  it("REQ-3540: también lanza en /tours?countryId= y en las rutas de página", async () => {
    await expect(go("/tours", repo({ countrySlugWithTours: revienta }), "countryId=7")).rejects.toBeInstanceOf(FalloDeBase);
    await expect(go("/viajes/mexico/teotihuacan", repo({ tripBySlug: revienta }))).rejects.toBeInstanceOf(FalloDeBase);
  });

  it("REQ-3540: «no hay fila» sigue siendo null, no un fallo: un tour que de verdad no está no inventa un 503", async () => {
    expect(await go("/tours/ck1", repo({ tourPlaceById: async () => null }))).toBeNull();
    expect(await go("/tours/ck1", repo({ tourPlaceById: async () => place({ countrySlug: null }) }))).toBeNull();
  });
});

describe("REQ-3540: la raíz del middleware aplica la decisión", () => {
  const fuente = readFileSync("src/destinations/middleware.ts", "utf8");

  it("REQ-3540: el middleware usa el reintento en vez de llamar a la decisión a pelo", () => {
    expect(fuente).toContain("decidirConReintento");
    expect(fuente).toMatch(/intento\.ok/);
  });

  it("REQ-3540: cuando no hay respuesta que dar, la petición sigue como hoy", () => {
    expect(fuente).toContain("if (!intento.respuesta) return null;");
  });

  it("REQ-3540: el 503 va con Retry-After, sin caché y sin indexar", () => {
    expect(fuente).toContain("'retry-after'");
    expect(fuente).toContain("'cache-control': 'no-store'");
    expect(fuente).toMatch(/'x-robots-tag': 'noindex'[\s\S]{0,80}\}\,\n\s*\}\);/);
  });
});
