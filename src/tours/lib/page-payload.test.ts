import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { slimToursPage, slimCountries } from "./page-payload";
import { transformDBToursToUITours, transformCountryForFilter } from "@/lib/db/tour-transformer";
import { fromCatalogTour } from "./card-sources";
import type { TourWithRelations } from "@/lib/db/repositories/tour-repository";
import type { CountryWithTranslations } from "@/types";

// REQ-10873 (ola 15, REQ-1562/1563): /tours manda al navegador solo lo que pintan la tarjeta y el pin.
const langs = { en: "Budapest", es: "Budapest", pt: "Budapeste", de: "Budapest", fr: "Budapest", it: "Budapest" };
const longText = "Descripción larga del tour. ".repeat(80);
function row(over: Partial<Record<string, unknown>> = {}): TourWithRelations {
  return {
    id: "t1", externalId: 101, providerId: "freetour", slug: "free-tour-budapest", providerTitle: "Guía Local", providerPhone: "+36 1 234",
    priceValue: "0", priceCurrency: "EUR", duration: "2:30", durationMinutes: 150, titleImageURL: "https://img/titulo.jpg",
    categoryId: 1, rating: "4.9", reviewsNumber: 812, cityId: 1776, countryId: 69,
    meetingPoint: { title: "Madách Imre tér", coordinates: "47.497,19.056", googlePlaceId: "x" },
    includes: ["Guía", "Mapa&nbsp;de la ciudad"], POIs: [{ title: "Parlamento", description: longText }],
    images: [{ id: 1, URL: "https://img/1.jpg" }, { id: 2, URL: "https://img/2.jpg" }, { id: 3, URL: "https://img/3.jpg" }],
    videoURL: null, isActive: true, lastSeenAt: new Date("2026-11-24T00:00:00Z"), guideLanguages: ["es", "en"],
    departureDates: Array.from({ length: 40 }, (_, i) => `2026-12-${String((i % 28) + 1).padStart(2, "0")}`),
    departuresSyncedAt: null, departuresCheckedAt: null,
    updatedAt: new Date("2026-11-24T00:00:00Z"), createdAt: new Date("2026-11-01T00:00:00Z"),
    translations: [{ id: "tr1", tourId: "t1", language: "es", title: "Free Tour de Budapest", brief: "La Perla del Danubio", description: longText, url: "https://freetour/es/budapest" }],
    city: { id: 1776, countryId: 69, translations: langs, geonameid: 1, slug: "budapest", stateCode: null, guide: longText, guideUpdatedAt: null, lat: 47.4, lng: 19.0 },
    country: { id: 69, code: "HU", iso2: "HU", translations: { en: "Hungary", es: "Hungría", pt: "Hungria", de: "Ungarn", fr: "Hongrie", it: "Ungheria" } },
    formato: "free-tour",
    ...over,
  } as unknown as TourWithRelations;
}

const rows: TourWithRelations[] = [
  row(),
  // Sin imagen de portada: la tarjeta toma la primera foto no vacía.
  row({ id: "t2", externalId: 102, titleImageURL: null, images: ["", "  ", "https://img/b.jpg", "https://img/c.jpg"] }),
  // Portada en blanco: tampoco cuenta.
  row({ id: "t3", externalId: 103, titleImageURL: "  ", images: [{ id: 9, URL: "https://img/z.jpg" }] }),
  // Tangol: la nota no se muestra (REQ-10652) y vende Travel Puzzle.
  row({ id: "t4", externalId: 104, providerId: "tangol", rating: "4.2", priceValue: "120", priceCurrency: "USD" }),
  // Ciudad sin traducción al idioma: cae al inglés; sin fotos ni punto de encuentro con coordenadas.
  row({ id: "t5", externalId: 105, images: [], titleImageURL: null, meetingPoint: { title: "Centro" }, city: { id: 9, translations: { en: "Eger" } } }),
];

const page = { data: rows, pagination: { total: 5, count: 5, currentPage: 1, perPage: 20, totalPages: 1, links: {} }, facets: { formato: { "free-tour": 5 }, tema: {}, atrib: {} }, priceLabels: { t4: { main: "MXN $2,300", approx: null } }, cardFormats: { t1: "Free tour" }, cardHrefs: { t1: "/destinos/hu/budapest/free-tour-budapest" } };

/** Lo que el navegador pinta de cada tour en /tours: la tarjeta y el pin del mapa (ToursPageClient). */
function painted(data: Array<{ id: string; meetingPoint?: unknown }>, lang: string) {
  const ui = transformDBToursToUITours(data as never, lang);
  return ui.map((t, i) => ({
    card: fromCatalogTour(t, { lang, highlight: null, formato: "Free tour", priceLabel: null, href: null }),
    pin: { id: t.id, externalId: t.externalId, title: t.title, image: t.images.find((x) => x && x.trim() !== "") ?? null, price: t.price, currency: t.currency, meetingPoint: data[i].meetingPoint ?? null },
  }));
}

describe("REQ-10873: carga de /tours para el navegador", () => {
  for (const lang of ["es", "en", "pt"]) {
    it(`REQ-10873: tarjetas y pines idénticos con la carga recortada (${lang})`, () => {
      const slim = slimToursPage(page as never, lang)!;
      expect(painted(slim.data, lang)).toEqual(painted(rows, lang));
    });
  }

  it("REQ-10873: conserva paginación, conteos de filtros, precios, formatos y enlaces de las tarjetas", () => {
    const slim = slimToursPage(page as never, "es")!;
    expect(slim.pagination).toEqual(page.pagination);
    expect(slim.facets).toEqual(page.facets);
    expect(slim.priceLabels).toEqual(page.priceLabels);
    expect(slim.cardFormats).toEqual(page.cardFormats);
    expect(slim.cardHrefs).toEqual(page.cardHrefs);
  });

  it("REQ-10873: no manda descripción, incluye, puntos de interés, fechas, teléfono del proveedor ni las otras fotos", () => {
    const slim = slimToursPage(page as never, "es")!;
    const json = JSON.stringify(slim.data);
    expect(json).not.toContain("Descripción larga");
    expect(json).not.toContain("+36 1 234");
    expect(json).not.toContain("2026-12-");
    expect(json).not.toContain("Parlamento");
    expect(json).not.toContain("https://img/2.jpg");
    expect(json).not.toContain("Hungría");
    // Solo el idioma de la página y el inglés de respaldo en la ciudad.
    expect(slim.data[0].city.translations).toEqual({ es: "Budapest", en: "Budapest" });
    // Pesa mucho menos que la fila completa.
    expect(json.length).toBeLessThan(JSON.stringify(rows).length / 4);
  });

  it("REQ-10873: tolera una página vacía o sin datos", () => {
    expect(slimToursPage({ data: [], pagination: page.pagination } as never, "es")!.data).toEqual([]);
    expect(slimToursPage(null as never, "es")).toBeNull();
  });

  it("REQ-10873: países del filtro con el mismo nombre y conteo, solo con el idioma de la página y el inglés", () => {
    const countries: CountryWithTranslations[] = [
      { id: 69, code: "HU", translations: { en: "Hungary", es: "Hungría", pt: "Hungria", de: "Ungarn", fr: "Hongrie", it: "Ungheria" }, _count: { tours: 12 } },
      { id: 70, code: "XX", translations: null, _count: { tours: 0 } },
      { id: 71, code: "YY", translations: { en: "Yland" }, _count: { tours: 3 } },
    ];
    for (const lang of ["es", "en", "de"]) {
      const slim = slimCountries(countries, lang);
      expect(slim.map((c) => transformCountryForFilter(c, lang))).toEqual(countries.map((c) => transformCountryForFilter(c, lang)));
      expect(slim.map((c) => c.code)).toEqual(["HU", "XX", "YY"]);
    }
    expect(slimCountries(countries, "es")[0].translations).toEqual({ es: "Hungría", en: "Hungary" });
  });

  it("REQ-10873: la página /tours le pasa al cliente la carga recortada", () => {
    const src = readFileSync("src/app/tours/page.tsx", "utf8");
    expect(src).toMatch(/initialToursData=\{slimToursPage\(toursData, language\)\}/);
    expect(src).toMatch(/initialCountriesData=\{slimCountries\(countriesData, language\)\}/);
  });
});
