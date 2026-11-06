import { describe, it, expect } from "vitest";
import { decideDestinationsRequest } from "./edge";
import type { DestinationsRepo, TourPlaceRow } from "./repository";

const place = (over: Partial<TourPlaceRow> = {}): TourPlaceRow => ({
  id: "ck1", slug: "centro-historico", status: "active", title: "Centro Histórico", countrySlug: "mx", citySlug: "ciudad-de-mexico", cityName: "Ciudad de México", cityLive: true, ...over,
});

function repo(over: Partial<DestinationsRepo> = {}): DestinationsRepo {
  return {
    countries: async () => [], cities: async () => [], tours: async () => [], trips: async () => [],
    tourPlaceById: async () => null, tourPlaceBySlug: async () => null, countrySlugWithTours: async () => null,
    tripBySlug: async () => null, citiesOf: async () => [],
    ...over,
  };
}
const go = (path: string, r: DestinationsRepo, search = "") => decideDestinationsRequest(path, new URLSearchParams(search), { repo: r, tripVisible: () => true });

describe("REQ-092: 301 desde URLs viejas, solo si el slug existe", () => {
  it("REQ-092: /tours/{id} con slug → 301 directo a la ficha nueva", async () => {
    expect(await go("/tours/ck1", repo({ tourPlaceById: async () => place() }))).toEqual({ type: "redirect", status: 301, location: "/destinos/mx/ciudad-de-mexico/centro-historico" });
  });

  it("REQ-092: sin slug del tour, de la ciudad o del país, no redirige (sigue la URL vieja)", async () => {
    for (const p of [place({ slug: null }), place({ citySlug: null }), place({ countrySlug: null })]) {
      expect(await go("/tours/ck1", repo({ tourPlaceById: async () => p }))).toBeNull();
    }
  });

  it("REQ-092: tour que no existe: no se toca (la página vieja da su 404)", async () => {
    expect(await go("/tours/nope", repo())).toBeNull();
  });

  it("REQ-092: /tours?countryId= → 301 al país solo si tiene ciudades con tours", async () => {
    expect(await go("/tours", repo({ countrySlugWithTours: async () => "pe" }), "countryId=7")).toEqual({ type: "redirect", status: 301, location: "/destinos/pe" });
    expect(await go("/tours", repo(), "countryId=7")).toBeNull();
  });

  it("REQ-092 (gate 4): /viajes/{destino}/{slug} → 301 a su ciudad si la ciudad tiene slug", async () => {
    const r = repo({
      tripBySlug: async () => ({ slug: "teotihuacan", kind: "tour", countries: ["MX"], cities: ["Ciudad de Mexico"] }),
      citiesOf: async () => [{ id: 10, countryId: 1, translations: { es: "Ciudad de México" }, slug: "ciudad-de-mexico", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null, iso2: "MX" }],
    });
    expect(await go("/viajes/mexico/teotihuacan", r)).toEqual({ type: "redirect", status: 301, location: "/destinos/mx/ciudad-de-mexico/teotihuacan" });
  });

  it("REQ-092 (gate 4): viaje sin ciudad con slug, oculto o inexistente: no redirige", async () => {
    const trip = { slug: "teotihuacan", kind: "tour", countries: ["MX"], cities: ["Ciudad de Mexico"] };
    expect(await go("/viajes/mexico/teotihuacan", repo({ tripBySlug: async () => trip }))).toBeNull();
    expect(await go("/viajes/mexico/x", repo())).toBeNull();
    const hidden = await decideDestinationsRequest("/viajes/mexico/teotihuacan", new URLSearchParams(), {
      repo: repo({ tripBySlug: async () => trip, citiesOf: async () => [{ id: 10, countryId: 1, translations: { es: "Ciudad de México" }, slug: "ciudad-de-mexico", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null, iso2: "MX" }] }),
      tripVisible: () => false,
    });
    expect(hidden).toBeNull();
  });
});

describe("REQ-092: 410 para tours removed", () => {
  it("REQ-092: la ficha nueva de un tour removed responde 410 con enlace a su ciudad", async () => {
    const d = await go("/destinos/mx/ciudad-de-mexico/centro-historico", repo({ tourPlaceBySlug: async () => place({ status: "removed" }) }));
    expect(d).toMatchObject({ type: "gone", status: 410 });
    expect((d as { html: string }).html).toContain('href="/destinos/mx/ciudad-de-mexico"');
  });

  it("REQ-092: la URL vieja de un tour removed también responde 410", async () => {
    expect(await go("/tours/ck1", repo({ tourPlaceById: async () => place({ status: "removed" }) }))).toMatchObject({ type: "gone", status: 410 });
  });

  it("REQ-092: si la ciudad ya no tiene tours, el 410 enlaza a /destinos", async () => {
    const d = await go("/destinos/mx/ciudad-de-mexico/centro-historico", repo({ tourPlaceBySlug: async () => place({ status: "removed", cityLive: false }) }));
    expect((d as { html: string }).html).toContain('href="/destinos"');
    expect((d as { html: string }).html).not.toContain('href="/destinos/mx/ciudad-de-mexico"');
  });

  it("REQ-092: tour activo o missing en /destinos: la página lo sirve (200)", async () => {
    expect(await go("/destinos/mx/ciudad-de-mexico/centro-historico", repo({ tourPlaceBySlug: async () => place({ status: "missing" }) }))).toBeNull();
  });

  it("REQ-092: si el slug es de otra ciudad, no se responde 410 aquí", async () => {
    expect(await go("/destinos/pe/lima/centro-historico", repo({ tourPlaceBySlug: async () => place({ status: "removed" }) }))).toBeNull();
  });
});

describe("REQ-102: sitemap por país", () => {
  it("REQ-102: /sitemap-tours-{pais}.xml se sirve desde su route handler", async () => {
    expect(await go("/sitemap-tours-mx.xml", repo())).toEqual({ type: "rewrite", path: "/sitemaps/tours/mx" });
  });
});

describe("blindaje: si D1 falla, el middleware no rompe la página", () => {
  it("REQ-092: error de la base = seguir sin redirigir", async () => {
    expect(await go("/tours/ck1", repo({ tourPlaceById: async () => { throw new Error("D1 DB is overloaded"); } }))).toBeNull();
  });
});
