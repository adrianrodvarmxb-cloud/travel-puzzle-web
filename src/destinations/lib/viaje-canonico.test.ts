import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { destinationTree, ownTripPlace, type CityRow, type CountryRow, type TripRow } from "./catalog";
import { sitemapInput } from "./page-model";
import { buildSitemaps } from "@/seo/lib/sitemaps";
import { viajesSitemapTrips } from "@/seo/lib/sitemaps-viajes";
import { decideDestinationsRequest } from "../edge";
import type { DestinationsRepo } from "../repository";
import { words } from "../fixtures/destinos";
import { fichaJsonLd } from "@/seo/lib/ficha-ld";
import { tripFichaInput } from "@/seo/lib/trip-ficha";

// REQ-1349 (PO 7-11 15:21: «sí, aplica las mejores prácticas de referentes»): una sola URL canónica por viaje, bajo su
// ciudad de inicio; las otras ciudades lo listan con esa misma URL; las URLs alternativas dan 301; sitemap sin repetidos.
const now = new Date("2026-11-07T12:00:00Z");
const city = (id: number, countryId: number, slug: string, es: string, en = es): CityRow => ({ id, countryId, slug, translations: { es, en }, guide: words(300), guideUpdatedAt: "2026-11-01T00:00:00Z", indexableSince: "2026-10-01T00:00:00Z", failingSince: null });
const countries: CountryRow[] = [
  { id: 4, code: "fr", iso2: "FR", translations: { es: "Francia", en: "France" } },
  { id: 5, code: "be", iso2: "BE", translations: { es: "Bélgica", en: "Belgium" } },
  { id: 6, code: "cn", iso2: "CN", translations: { es: "China", en: "China" } },
];
// A propósito, el orden de la base NO es el del viaje (Brujas antes que París, Shanghái antes que Pekín).
const cities: CityRow[] = [
  city(41, 5, "brujas", "Brujas", "Bruges"), city(40, 4, "paris", "París", "Paris"),
  city(66, 6, "shanghai", "Shanghái", "Shanghai"), city(65, 6, "suzhou", "Suzhou"), city(64, 6, "hangzhou", "Hangzhou"),
  city(63, 6, "guilin", "Guilin"), city(62, 6, "xian", "Xi’an"), city(61, 6, "pekin", "Pekín", "Beijing"),
];
const trip = (slug: string, countries: string[], cities: string[]): TripRow => ({ id: slug, slug, kind: "circuito", title: slug, image: null, countries, cities, priceLabel: null, updatedAt: "2026-11-06T00:00:00Z" });
const BRUJAS = trip("brujas-belgica-guiado-desde-paris-ext-eur-t01-119", ["FR", "BE"], ["París", "Brujas"]);
const CHINA = trip("china-beijing-xi-an-guilin-hangzhou-suzhou-shanghai-13-dias-fch-cn-c13-006", ["CN"], ["Beijing", "Xi’an", "Guilin", "Hangzhou", "Suzhou", "Shanghai"]);
const tree = destinationTree({ countries, cities, tours: [], trips: [BRUJAS, CHINA], now });
const iso: Record<number, string> = { 4: "FR", 5: "BE", 6: "CN" };
const withIso = cities.map((c) => ({ ...c, iso2: iso[c.countryId] }));
const hrefsOf = (slug: string) => tree.flatMap((c) => c.cities.flatMap((ci) => ci.ownTrips.filter((t) => t.href.endsWith(`/${slug}`)).map((t) => ({ at: `${c.slug}/${ci.slug}`, href: t.href }))));

describe("REQ-1349: una sola URL canónica por viaje, bajo su ciudad de inicio", () => {
  it("REQ-1349: la ciudad canónica es la primera del viaje (París; Pekín), no el orden de la base", () => {
    expect(ownTripPlace(BRUJAS, withIso)).toEqual({ countrySlug: "fr", citySlug: "paris", slug: BRUJAS.slug });
    expect(ownTripPlace(CHINA, withIso)).toEqual({ countrySlug: "cn", citySlug: "pekin", slug: CHINA.slug });
  });
  it("REQ-1349: brujas-belgica-guiado-desde-paris: París y Brujas lo listan, ambas con la URL de París", () => {
    const h = hrefsOf(BRUJAS.slug);
    expect(h.map((x) => x.at).sort()).toEqual(["be/brujas", "fr/paris"]);
    expect(new Set(h.map((x) => x.href))).toEqual(new Set([`/destinos/fr/paris/${BRUJAS.slug}`]));
  });
  it("REQ-1349: circuito de Fantástica China con 6 ciudades: las 6 lo listan con la URL de Pekín", () => {
    const h = hrefsOf(CHINA.slug);
    expect(h).toHaveLength(6);
    expect(new Set(h.map((x) => x.href))).toEqual(new Set([`/destinos/cn/pekin/${CHINA.slug}`]));
  });
  it("REQ-1349: ningún sitemap repite un viaje (ni una URL), con y sin idiomas", () => {
    for (const locales of [false, true]) {
      const input = sitemapInput(tree, "https://travelpuzzle.com.mx", { locales });
      const placed = new Set(tree.flatMap((c) => c.cities.flatMap((ci) => ci.ownTrips.map((t) => t.id))));
      const { files } = buildSitemaps({ ...input, trips: viajesSitemapTrips([], placed, () => true) });
      const locs = Object.values(files).flatMap((x) => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
      expect(locs.length).toBe(new Set(locs).size);
      for (const t of [BRUJAS, CHINA]) expect(locs.filter((l) => l.endsWith(`/${t.slug}`))).toHaveLength(1);
      expect(locs).toContain(`https://travelpuzzle.com.mx/destinos/cn/pekin/${CHINA.slug}`);
    }
  });
});

describe("REQ-1349: las URLs alternativas redirigen con 301 a la canónica", () => {
  const repo = (over: Partial<DestinationsRepo> = {}): DestinationsRepo => ({
    countries: async () => [], cities: async () => [], tours: async () => [], trips: async () => [],
    tourPlaceById: async () => null, tourPlaceBySlug: async () => null, countrySlugWithTours: async () => null,
    tripBySlug: async (s) => ([BRUJAS, CHINA].find((t) => t.slug === s) ?? null) as never,
    citiesOf: async (codes) => withIso.filter((c) => codes.map((x) => x.toUpperCase()).includes(c.iso2)),
    ...over,
  });
  const go = (path: string, r = repo()) => decideDestinationsRequest(path, new URLSearchParams(), { repo: r, tripVisible: () => true });
  it("REQ-1349: /destinos/be/brujas/<viaje> → 301 a /destinos/fr/paris/<viaje>", async () => {
    expect(await go(`/destinos/be/brujas/${BRUJAS.slug}`)).toEqual({ type: "redirect", status: 301, location: `/destinos/fr/paris/${BRUJAS.slug}` });
  });
  it("REQ-1349: /destinos/cn/shanghai/<circuito> → 301 a Pekín; la canónica no se toca", async () => {
    expect(await go(`/destinos/cn/shanghai/${CHINA.slug}`)).toEqual({ type: "redirect", status: 301, location: `/destinos/cn/pekin/${CHINA.slug}` });
    expect(await go(`/destinos/cn/pekin/${CHINA.slug}`)).toBeNull();
  });
  it("REQ-1349: un tour de FREETOUR con ese slug no consulta viajes; si la base falla, no se redirige", async () => {
    expect(await go(`/destinos/be/brujas/${BRUJAS.slug}`, repo({ tourPlaceBySlug: async () => ({ id: "t", slug: BRUJAS.slug, status: "active", title: "", countrySlug: "be", citySlug: "brujas", cityName: "Brujas", cityLive: true }), tripBySlug: async () => { throw new Error("no debía consultarse"); } }))).toBeNull();
    expect(await go(`/destinos/be/brujas/${BRUJAS.slug}`, repo({ tripBySlug: async () => { throw new Error("D1"); } }))).toBeNull();
  });
  it("REQ-1349: la ficha, si el middleware no decidió, también manda a la canónica (permanentRedirect)", () => {
    const page = readFileSync("src/app/destinos/[pais]/[ciudad]/[slug]/page.tsx", "utf8");
    expect(page).toContain("permanentRedirect(");
  });
});

describe("REQ-1349: JSON-LD de la ficha con el itinerario de todas las ciudades", () => {
  it("REQ-1349: itinerary = ItemList de Place, en orden", () => {
    const input = tripFichaInput({
      trip: { kind: "circuito", titleEs: "China", priceFrom: 1000, currency: "USD", durationDays: 13, languages: ["es"], options: [], flightsIncluded: false, countries: ["CN"], cities: CHINA.cities, meetingPoints: [] },
      lang: "es", url: `https://travelpuzzle.com.mx/destinos/cn/pekin/${CHINA.slug}`, title: "China", summary: null, operator: "Fantástica China", duration: "13 días", languageNames: ["español"], priceText: null, places: null, includes: [],
    });
    const ld = fichaJsonLd(input) as { itinerary?: { "@type": string; itemListElement: { position: number; item: { "@type": string; name: string } }[] } };
    expect(ld.itinerary?.["@type"]).toBe("ItemList");
    expect(ld.itinerary?.itemListElement.map((e) => e.item.name)).toEqual(CHINA.cities);
    expect(ld.itinerary?.itemListElement.map((e) => e.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
