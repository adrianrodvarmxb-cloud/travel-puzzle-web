/**
 * REQ-580: test de contrato de las fichas. Recorre cada tipo de ficha (tour de cada proveedor con mapeo en la
 * taxonomía, más uno nuevo; viaje de agencia y viaje propio), pinta en el servidor las piezas reales de la página
 * (encabezado, datos clave, precio y JSON-LD) y exige el contrato de `fichaContractFailures`. Un proveedor nuevo
 * entra solo a este test en cuanto tiene su mapeo (REQ-404) y falla si no cumple.
 */
import { describe, expect, it, vi } from "vitest";
import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { es } from "@/lib/translations/es";

vi.mock("@/lib/language-context", () => ({
  useLanguage: () => ({
    language: "es",
    isInitialized: true,
    setLanguage: () => {},
    t: (key: string, fallback?: string) => {
      const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), es);
      return typeof v === "string" ? v : fallback ?? key;
    },
  }),
}));

import { TourHeroSection } from "@/components/tours/one/TourHeroSection";
import { TourSidebar } from "@/components/tours/one/TourSidebar";
import { TripHeader } from "@/components/trips/TripHeader";
import { TripPriceBox } from "@/components/trips/TripPriceBox";
import { JsonLd } from "@/components/destinations/JsonLd";
import { destinationTree, findCity } from "@/destinations/lib/catalog";
import { fx, tour } from "@/destinations/fixtures/destinos";
import { tourPage } from "@/destinations/lib/page-model";
import { DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { tripCopy } from "@/trips/lib/copy";
import { enBreve, fichaJsonLd, guideLanguagesLabel } from "./ficha-ld";
import { indexableEnrichment } from "./enrichment";
import { tripFichaInput } from "./trip-ficha";
import { fichaContractFailures, isFichaPath } from "./ficha-contract";
import type { Tour } from "@/types";

const site = "https://travelpuzzle.com.mx";
const now = new Date("2026-11-05T12:00:00Z");

/** HTML de servidor de la ficha de un tour (las mismas piezas que /destinos/{pais}/{ciudad}/{slug}). */
function tourHtml(providerId: string, paid: boolean) {
  const row = tour(10, 1, { title: "Centro Histórico a pie", provider: "Guía Ana", price: paid ? 25 : 0, currency: paid ? "USD" : "EUR", duration: "2:30" });
  const tree = destinationTree({ ...fx, tours: [row], trips: [], now });
  const { country, city } = findCity(tree, "mx", "ciudad-de-mexico")!;
  const card = [...city.freeTours, ...city.paidTours][0];
  const detail = { providerId, guideLanguages: '["en","sp"]', departureDates: ["2026-11-09"], meetingPoint: { title: "Zócalo", lat: 19.43, lng: -99.13 } };
  const m = tourPage({ country, city, tour: card, siteUrl: site, lang: "es", detail, today: "2026-11-06" });
  const uiTour = {
    id: card.id, externalId: 1, title: card.title, brief: null, description: null, destination: city.name, provider: "Guía Ana", providerPhone: null,
    price: card.price, currency: card.currency, images: [], titleImageURL: null, duration: "2:30", meetingPoint: { title: "Zócalo", coordinates: "19.43,-99.13", googlePlaceId: "" },
    includes: [], rating: 4.9, reviewsNumber: 900, bookingURL: "", isActive: true, createdAt: new Date(0),
  } as unknown as Tour;
  const view = {
    crumbs: m.crumbs, badge: m.badge, notice: m.notice, operatedBy: m.operatedBy, isFreeTour: card.isFreeTour, favorite: false, rates: null, labels: m.labels,
    facts: { duration: m.facts.duration, extra: [{ label: "Idioma del guía", value: guideLanguagesLabel(detail.guideLanguages, "es").join(", ") }] },
    enrichment: m.enrichment, enBreve: m.enBreve, facets: m.facets,
  };
  return {
    currency: card.currency,
    enrichment: indexableEnrichment(providerId),
    html: renderToStaticMarkup(h(Fragment, null, h(JsonLd, { data: m.jsonLd }), h(TourHeroSection, { tour: uiTour, primeraPieza: view }), h(TourSidebar, { tour: uiTour, mode: "advisor" }))),
  };
}

/** HTML de servidor de la ficha de un viaje (encabezado, caja de precio y JSON-LD de TripDetailView). */
function tripHtml(agency: string | null) {
  const c = tripCopy("es");
  const trip = {
    kind: "circuito", titleEs: "Francia esencial", titleEn: "Essential France", summaryEs: "Ocho días por París, el Loira y Normandía.", priceFrom: 1890, currency: "EUR",
    durationDays: 8, languages: ["es"], options: [{ mode: "group" as const }], flightsIncluded: false, category: null, agencyId: agency ? "ag1" : null,
    countries: ["FR"], cities: ["París", "Tours", "Caen"], meetingPoints: [{ name: "Hotel en París", address: "", lat: null, lng: null }],
  };
  const operator = agency ?? "Travel Puzzle";
  const price = { main: "MXN $39,980", original: "EUR €1,890", rateNote: "Tipo de cambio Banxico" };
  const input = tripFichaInput({
    trip, lang: "es", url: `${site}/viajes/francia/francia-esencial`, title: "Francia esencial", summary: trip.summaryEs, operator, duration: c.days(8),
    languageNames: ["español"], priceText: `${c.from} ${price.main} · ${price.original}`, places: "París, Tours, Caen · Francia", includes: ["Hoteles 4*", "Desayunos", "Tren París–Tours"], formato: "circuito",
  });
  const breve = enBreve(input);
  return {
    currency: "EUR",
    enrichment: indexableEnrichment(input.provider),
    breve,
    html: renderToStaticMarkup(h(Fragment, null,
      h(JsonLd, { data: [fichaJsonLd(input)] }),
      h(TripHeader, { eyebrow: `Circuito · Francia · ${c.days(8)}`, title: "Francia esencial", cities: trip.cities, breve, tipo: input.tipo, etiquetas: input.etiquetas, lang: "es" }),
      h(TripPriceBox, { price, c, whatsappUrl: null }),
    )),
  };
}

const strict = { requireDuration: true, requireOperator: true, requireOffer: true };
const tourProviders = [...Object.keys(DEFAULT_MAPPINGS).filter((p) => p !== "propios"), "proveedor-nuevo"];

describe("REQ-580: contrato de cada tipo de ficha", () => {
  for (const provider of tourProviders) {
    for (const paid of [false, true]) {
      it(`REQ-580: tour de ${provider} (${paid ? "de pago" : "pieza libre"}) cumple el contrato`, () => {
        const f = tourHtml(provider, paid);
        expect(fichaContractFailures(f.html, { enrichment: f.enrichment, currency: f.currency, ...strict })).toEqual([]);
        // REQ-578: el idioma del guía y la duración legible están en el HTML del servidor.
        expect(f.html).toContain("Inglés, Español");
        expect(f.html).toContain("2 h 30 min");
        expect(f.html).toContain(`data-enriquecimiento="${f.enrichment}"`);
        if (!f.enrichment) expect(f.html).not.toContain('data-seo="en-breve"');
        else expect(f.html).toContain('data-seo="en-breve"');
      });
    }
  }
  for (const agency of ["Extime Travel", null]) {
    it(`REQ-580: viaje ${agency ? `de agencia (${agency})` : "propio"} cumple el contrato y lleva «En breve» con tipo y etiquetas`, () => {
      const f = tripHtml(agency);
      expect(f.enrichment).toBe(true);
      expect(fichaContractFailures(f.html, { enrichment: true, currency: f.currency, ...strict })).toEqual([]);
      expect(f.html).toContain('data-seo="en-breve"');
      expect(f.html).toContain('data-seo="tipo"');
      expect(f.html).toContain("Circuito (varios días)");
      const n = f.breve!.split(/\s+/).length;
      expect(n).toBeGreaterThanOrEqual(40);
      expect(n).toBeLessThanOrEqual(80);
    });
  }
});

describe("REQ-580: el contrato detecta lo que no cumple", () => {
  const good = tripHtml("Extime Travel").html;
  it("REQ-580: AggregateRating de terceros, moneda equivocada y FREETOUR como operador fallan", () => {
    const withRating = good.replace('"@type":["Product","TouristTrip"]', '"@type":["Product","TouristTrip"],"aggregateRating":{"@type":"AggregateRating","ratingValue":9.8,"reviewCount":203}');
    expect(fichaContractFailures(withRating, { enrichment: true })).toContain("JSON-LD con aggregateRating o review que no son reseñas propias (Gate 2)");
    expect(fichaContractFailures(good, { enrichment: true, currency: "MXN" })).toContain("moneda EUR, se esperaba MXN");
    expect(fichaContractFailures(good.replace(/Extime Travel/g, "FREETOUR.com"), { enrichment: true }).join(" ")).toMatch(/FREETOUR/);
  });
  it("REQ-580: sin H1, JSON-LD roto o «En breve» con el interruptor apagado fallan", () => {
    expect(fichaContractFailures(good.replace(/<h1[^>]*>.*?<\/h1>/, ""), { enrichment: true })[0]).toMatch(/H1/);
    expect(fichaContractFailures(good.replace('"@context"', '"@context" oops'), { enrichment: true }).join(" ")).toMatch(/no parsea/);
    expect(fichaContractFailures(good, { enrichment: false }).join(" ")).toMatch(/En breve/);
  });
  it("REQ-580: precio y duración del marcado deben verse en la página", () => {
    expect(fichaContractFailures(good.replace(/EUR €1,890/g, ""), { enrichment: true }).join(" ")).toMatch(/precio 1890/);
    expect(fichaContractFailures(good.replace('"value":"8 días"', '"value":"9 días"'), { enrichment: true }).join(" ")).toMatch(/duración «9 días»/);
  });
  it("REQ-580: la prueba de humo revisa solo las fichas de producto", () => {
    expect(isFichaPath("/viajes/francia/louvre-ext-fr-t01-085")).toBe(true);
    expect(isFichaPath("/destinos/mx/ciudad-de-mexico/centro")).toBe(true);
    expect(isFichaPath("/destinos/mx/ciudad-de-mexico")).toBe(false);
    expect(isFichaPath("/tours")).toBe(false);
  });
});
