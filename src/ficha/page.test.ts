// REQ-10859: la página de un tour de Tangol con la plantilla nueva, con dependencias inyectadas. npx vitest run src/ficha/page.test.ts
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "../../tests/fixtures/tangol/tour-43-glaciar-perito-moreno.json";
import { FichaView } from "@/components/ficha/FichaView";
import { FichaPanel } from "@/components/ficha/FichaPanel";
import type { TourRowWithRelations } from "./lib/tour-input";
import { loadTourFichaPage, pageFlags, tourUsesFichaUnica } from "./page";
import type { TourFichaDeps } from "./source-tour";

const { translation, city, country, whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo, ...tour } = fixture;
const row = (): TourRowWithRelations => ({
  ...tour,
  translations: [{ language: "es", title: translation.title, brief: translation.brief, description: translation.description }],
  city: { slug: city.slug, translations: { es: city.name }, lat: -50.34, lng: -72.26 },
  country: { code: "ARG", iso2: country.code, translations: { es: country.name } },
} as unknown as TourRowWithRelations);
const practical = { whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo };
const env = { ZONE_MAP_ENABLED: "true", WHATSAPP_NUMBER: "525536490320", BOOKINGS_ENABLED: "true", PAID_TOURS_ENABLED: "true", FICHA_MILA_ENABLED: "true" };
const deps = (over: Partial<TourFichaDeps> = {}): TourFichaDeps => ({
  tourBySlug: async (slug) => (slug === fixture.slug ? row() : null),
  practicalRow: async () => practical,
  env,
  now: () => new Date("2026-11-22T09:00:00Z"),
  ...over,
});
const extras = { query: {}, reviews: { items: [], total: 0 }, fx: { USD: 20, EUR: 22, date: "2026-11-22" }, visitorCountry: "MX" };

describe("REQ-10859: tour de Tangol → plantilla única", () => {
  it("REQ-10859: arma la página completa desde la fila real: bloques por dato, panel con precio local y Mila, ruta pública", async () => {
    const p = await loadTourFichaPage(deps(), fixture.slug, "es", extras);
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.path).toBe("/destinos/ar/el-calafate/glaciar-perito-moreno");
    expect(p.page.order.slice(0, 3)).toEqual(["migas", "galeria", "titulo"]);
    expect(p.page.order).toContain("antes-de-ir");
    expect(p.page.order).toContain("mila");
    expect(p.page.order).not.toContain("resenas");
    expect(p.page.plan.control).toBe("request-form");
    expect(p.page.panel.price?.text).toMatch(/MXN|USD|\$/);
    expect(p.page.panel.advisor).toMatchObject({ kind: "mila" });
    expect(p.page.views.mila?.view?.href).toContain("wa.me/525536490320");
    const html = renderToStaticMarkup(createElement(FichaView, {
      order: p.page.order, views: p.page.views,
      panel: createElement(FichaPanel, { panel: p.page.panel, lang: p.ficha.lang, controls: {} }), enrichment: true,
    }));
    expect(html).toContain('data-enriquecimiento="true"'); // contrato de ficha del humo (REQ-588 / REQ-834)
    expect(html).toContain("Glaciar Perito Moreno");
    expect(html).toContain('data-panel="reserva"');
    expect(html).toContain('data-control="advisor"'); // sin control registrado, cae al asesor (INC-020)
    expect(html).not.toContain("N/D");
    expect(html).not.toMatch(/neto|margen/i);
  });

  it("REQ-10859: sin modelo (slug inexistente) devuelve null y la página pinta la plantilla de hoy", async () => {
    expect(await loadTourFichaPage(deps(), "no-existe", "es", extras)).toBeNull();
  });

  it("REQ-10859: las banderas se resuelven una vez desde el entorno; apagadas por omisión", () => {
    expect(pageFlags({})).toMatchObject({ bookings: false, paidTours: false, directPurchase: false, milaEnabled: false, cartEnabled: false, cardHold: false, freetourFaqEnabled: false });
    expect(pageFlags({ BIGBUS_OCTO_ENABLED: "live", STRIPE_HOLD_ENABLED: "true" })).toMatchObject({ directPurchase: true, cardHold: true });
  });

  it("REQ-10874: el HTML en caché no depende del visitante: aun con país MX el panel va en la moneda del proveedor; con LOCAL_CURRENCY_ENABLED lleva la ruta del precio local", async () => {
    const neutro = await loadTourFichaPage(deps(), fixture.slug, "es", extras); // extras trae visitorCountry: "MX" y tasas
    expect(neutro!.page.panel.price?.text).toBe("USD $98 por persona · se cobra en USD");
    expect(neutro!.page.panel.price?.localUrl).toBeNull();
    const local = await loadTourFichaPage(deps({ env: { ...env, LOCAL_CURRENCY_ENABLED: "true" } }), fixture.slug, "es", extras);
    expect(local!.page.panel.price?.text).toBe("USD $98 por persona · se cobra en USD");
    expect(local!.page.panel.price?.localUrl).toBe("/api/precio-local?amount=98&currency=USD&per=person&lang=es");
    expect(pageFlags({ LOCAL_CURRENCY_ENABLED: "true" }).localCurrency).toBe(true);
    expect(pageFlags({}).localCurrency).toBe(false);
  });

  it("REQ-10859: la plantilla nueva solo con la bandera de Tangol: «preview» en versiones sin tráfico, nunca para otro proveedor", () => {
    const prev = "pr-717-travel-puzzle-web.x.workers.dev";
    expect(tourUsesFichaUnica({ FICHA_UNICA_TANGOL_ENABLED: "preview" }, "tangol", prev)).toBe(true);
    expect(tourUsesFichaUnica({ FICHA_UNICA_TANGOL_ENABLED: "preview" }, "tangol", "www.travelpuzzle.com.mx")).toBe(false);
    expect(tourUsesFichaUnica({ FICHA_UNICA_TANGOL_ENABLED: "true" }, "freetour", prev)).toBe(false);
    expect(tourUsesFichaUnica({}, "tangol", prev)).toBe(false);
  });

  it("REQ-10860: la franja de hoy y la tarjeta de Kiwitaxi alimentan «Completa tu viaje»; sin ellas el bloque no sale", async () => {
    const con = await loadTourFichaPage(deps(), fixture.slug, "es", {
      ...extras,
      transport: [{ id: "t1", path: "/destinos/ar/el-calafate/traslado-aeropuerto", title: "Traslado aeropuerto", image: null }],
      kiwitaxi: { id: "kiwi", url: "https://kiwitaxi.example/x", title: "Traslado privado", by: "Kiwitaxi", external: true },
    });
    expect(con?.page.order).toContain("completa-tu-viaje");
    expect(con?.page.views["completa-tu-viaje"]?.view?.transport[0]?.href).toBe("/destinos/ar/el-calafate/traslado-aeropuerto");
    expect(con?.page.views["completa-tu-viaje"]?.view?.affiliate?.by).toBe("Kiwitaxi");
    const sin = await loadTourFichaPage(deps(), fixture.slug, "es", extras);
    expect(sin?.page.order).not.toContain("completa-tu-viaje");
  });

  it("REQ-10862: las experiencias de la ciudad alimentan «Otras experiencias» con 60/40 y tope por proveedor; sin ellas el bloque no sale", async () => {
    const card = (id: string, provider: string, priceText: string) => ({ id, title: `Tour ${id}`, href: `/destinos/ar/el-calafate/${id}`, provider, imageUrl: `https://img/${id}.jpg`, priceText });
    const con = await loadTourFichaPage(deps(), fixture.slug, "es", {
      ...extras,
      others: { paid: [card("p1", "tangol", "Desde USD $45"), card("p2", "tangol", "Desde USD $60"), card("p3", "tangol", "Desde USD $70")], free: [card("f1", "freetour", "Gratis")], includePaid: true },
    });
    expect(con?.page.order).toContain("otras-experiencias");
    const items = con?.page.views["otras-experiencias"]?.view?.items ?? [];
    expect(items.map((c) => c.id)).toEqual(["p1", "p2", "f1"]); // 2 de pago + 1 gratis; a lo más 2 del mismo proveedor
    expect(con?.page.views["otras-experiencias"]?.view?.heading).toBe("Otras experiencias en El Calafate");
    const html = renderToStaticMarkup(createElement(FichaView, {
      order: con!.page.order, views: con!.page.views,
      panel: createElement(FichaPanel, { panel: con!.page.panel, lang: con!.ficha.lang, controls: {} }), enrichment: true,
    }));
    expect(html).toContain('data-bloque="otras-experiencias"');
    expect(html).toContain('href="/destinos/ar/el-calafate/f1"');
    expect(html).not.toMatch(/neto|margen/i);
    const sin = await loadTourFichaPage(deps(), fixture.slug, "es", extras);
    expect(sin?.page.order).not.toContain("otras-experiencias");
  });
});

// REQ-10870: la página de un viaje (agencia o Big Bus) con la plantilla nueva, tras FICHA_UNICA_TRIP_ENABLED.
import tripFixture from "../../tests/fixtures/trips/tas-mys-01-malasia-esencial.json";
import { loadTripFichaPage, tripUsesFichaUnica } from "./page";
import type { TripFichaDeps } from "./source";
import type { StoredTrip } from "@/trips/manage";

const tripDeps = (over: Partial<TripFichaDeps> = {}): TripFichaDeps => ({
  tripBySlug: async (slug) => (slug === tripFixture.slug ? { trip: tripFixture as unknown as StoredTrip, translations: null, agencyName: tripFixture.agencyName } : null),
  env: { ...env, SITE_URL: "https://travelpuzzle.com.mx" },
  now: () => new Date("2026-11-24T09:00:00Z"),
  ...over,
});

describe("REQ-10870: viaje de agencia o Big Bus → plantilla única", () => {
  it("REQ-10870: arma la página desde la fila real: ruta de /viajes, bloques por dato, formulario de cotización en el panel y precio «desde» sin neto", async () => {
    const p = await loadTripFichaPage(tripDeps(), tripFixture.slug, "es", extras);
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.path).toBe(`/viajes/malasia/${tripFixture.slug}`);
    expect(p.agencyId).toBe(tripFixture.agencyId);
    expect(p.page.order.slice(0, 3)).toEqual(["migas", "galeria", "titulo"]);
    expect(p.page.order).toContain("itinerario");
    expect(p.page.order).toContain("opciones");
    expect(p.page.order).toContain("mila");
    expect(p.page.plan.control).toBe("request-form"); // viaje a cotizar: formulario, nunca el calendario de FREETOUR (INC-020)
    expect(p.page.panel.price?.text).toMatch(/USD/);
    const html = renderToStaticMarkup(createElement(FichaView, {
      order: p.page.order, views: p.page.views,
      panel: createElement(FichaPanel, { panel: p.page.panel, lang: p.ficha.lang, controls: {} }), enrichment: true,
    }));
    expect(html).toContain('data-enriquecimiento="true"');
    expect(html).toContain("Malasia Esencial");
    expect(html).toContain('data-panel="reserva"');
    expect(html).toContain('data-control="advisor"'); // sin control registrado, cae al asesor (INC-020)
    expect(html).not.toContain("N/D");
    expect(html).not.toMatch(/neto|margen/i);
  });

  it("REQ-10870: un viaje de compra directa (Big Bus) pide la caja de compra solo con BIGBUS_OCTO_ENABLED; apagada, el asesor", async () => {
    const buy = { ...(tripFixture as unknown as StoredTrip), purchaseMode: "buy" } as StoredTrip;
    const src = async () => ({ trip: buy, translations: null, agencyName: null });
    const off = await loadTripFichaPage(tripDeps({ tripBySlug: src }), tripFixture.slug, "es", extras);
    expect(off?.page.plan).toMatchObject({ control: "advisor", fellBackToAdvisor: true });
    const on = await loadTripFichaPage(tripDeps({ tripBySlug: src, env: { ...env, SITE_URL: "https://travelpuzzle.com.mx", BIGBUS_OCTO_ENABLED: "true" } }), tripFixture.slug, "es", extras);
    expect(on?.page.plan).toMatchObject({ control: "purchase-box", fellBackToAdvisor: false });
  });

  it("REQ-10872: las experiencias de la ciudad del viaje alimentan «Otras experiencias» en /viajes con la misma regla que el tour; sin ellas el bloque no sale", async () => {
    const card = (id: string, provider: string, priceText: string) => ({ id, title: `Tour ${id}`, href: `/destinos/my/kuala-lumpur/${id}`, provider, imageUrl: `https://img/${id}.jpg`, priceText });
    const con = await loadTripFichaPage(tripDeps(), tripFixture.slug, "es", {
      ...extras,
      others: { paid: [card("p1", "tangol", "Desde USD $45"), card("p2", "tangol", "Desde USD $60"), card("p3", "tangol", "Desde USD $70")], free: [card("f1", "freetour", "Gratis")], includePaid: true },
    });
    expect(con?.page.order).toContain("otras-experiencias");
    expect((con?.page.views["otras-experiencias"]?.view?.items ?? []).map((c) => c.id)).toEqual(["p1", "p2", "f1"]);
    const html = renderToStaticMarkup(createElement(FichaView, {
      order: con!.page.order, views: con!.page.views,
      panel: createElement(FichaPanel, { panel: con!.page.panel, lang: con!.ficha.lang, controls: {} }), enrichment: true,
    }));
    expect(html).toContain('data-bloque="otras-experiencias"');
    expect(html).toContain('href="/destinos/my/kuala-lumpur/f1"');
    expect(html).not.toMatch(/neto|margen/i);
    const sin = await loadTripFichaPage(tripDeps(), tripFixture.slug, "es", extras);
    expect(sin?.page.order).not.toContain("otras-experiencias");
  });

  it("REQ-10870: sin viaje (slug inexistente o apagado) devuelve null y la página pinta la plantilla de hoy", async () => {
    expect(await loadTripFichaPage(tripDeps(), "no-existe", "es", extras)).toBeNull();
  });

  it("REQ-10870: la plantilla nueva en viajes solo con FICHA_UNICA_TRIP_ENABLED: «preview» en versiones sin tráfico; la bandera de Tangol no la enciende", () => {
    const prev = "pr-741-travel-puzzle-web.x.workers.dev";
    expect(tripUsesFichaUnica({ FICHA_UNICA_TRIP_ENABLED: "preview" }, prev)).toBe(true);
    expect(tripUsesFichaUnica({ FICHA_UNICA_TRIP_ENABLED: "preview" }, "www.travelpuzzle.com.mx")).toBe(false);
    expect(tripUsesFichaUnica({ FICHA_UNICA_TRIP_ENABLED: "true" }, "www.travelpuzzle.com.mx")).toBe(true);
    expect(tripUsesFichaUnica({ FICHA_UNICA_TANGOL_ENABLED: "true" }, prev)).toBe(false);
    expect(tripUsesFichaUnica({}, prev)).toBe(false);
  });
});
