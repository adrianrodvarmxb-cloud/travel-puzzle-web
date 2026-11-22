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
      panel: createElement(FichaPanel, { panel: p.page.panel, lang: p.ficha.lang, controls: {} }),
    }));
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

  it("REQ-10859: la plantilla nueva solo con la bandera de Tangol: «preview» en versiones sin tráfico, nunca para otro proveedor", () => {
    const prev = "pr-717-travel-puzzle-web.x.workers.dev";
    expect(tourUsesFichaUnica({ FICHA_UNICA_TANGOL_ENABLED: "preview" }, "tangol", prev)).toBe(true);
    expect(tourUsesFichaUnica({ FICHA_UNICA_TANGOL_ENABLED: "preview" }, "tangol", "www.travelpuzzle.com.mx")).toBe(false);
    expect(tourUsesFichaUnica({ FICHA_UNICA_TANGOL_ENABLED: "true" }, "freetour", prev)).toBe(false);
    expect(tourUsesFichaUnica({}, "tangol", prev)).toBe(false);
  });
});
