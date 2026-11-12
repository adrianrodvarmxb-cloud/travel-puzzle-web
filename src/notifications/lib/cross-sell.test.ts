import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildEmailCrossSell, CROSS_SELL_POLICY, crossSellEnabled, crossSellText, PROMO_WORDS, renderCrossSellHtml, withUtm,
  type EmailCrossSellCandidate, type EmailCrossSellInput,
} from "./cross-sell";

const SITE = "https://travelpuzzle.com.mx";
const NOW = Date.parse("2026-11-10T12:00:00Z");
const transfer: EmailCrossSellCandidate = { source: "affiliate", category: "transfer", title: "Traslado del aeropuerto a tu hotel", provider: "Kiwitaxi", url: "/traslados", dates: "any" };
const bus: EmailCrossSellCandidate = { source: "own", category: "transport", title: "Bus turístico hop-on hop-off en Lima", provider: "Travel Puzzle", url: "/viajes/bus-lima", priceLabel: "Desde $450 MXN", dates: ["2026-11-20", "2026-11-21"] };
const ownTour: EmailCrossSellCandidate = { source: "own", category: "tour", title: "City Tour Virreinal de Lima", provider: "Travel Puzzle", url: "/viajes/city-tour-lima", dates: ["2026-11-20"] };
const ftTour: EmailCrossSellCandidate = { source: "freetour", category: "tour", title: "Free tour por el centro", provider: "Guía local", url: "/tours/abc", dates: "any" };

const input = (over: Partial<EmailCrossSellInput> = {}): EmailCrossSellInput => ({
  email: "confirmation", enabled: true, optedOut: false, lang: "es", site: SITE,
  context: { cityName: "Lima", country: "PE", cityCode: "lima", day: "2026-11-20", freeTourAt: "2026-11-20T14:00:00Z", now: NOW },
  candidates: [transfer, bus, ownTour, ftTour],
  ...over,
});

describe("REQ-262 qué correo lleva el bloque", () => {
  it("REQ-262 confirmación, recordatorios, cambio y post-tour sí; rechazo, cancelación, solicitudes, pagos e internos no", () => {
    const si = Object.entries(CROSS_SELL_POLICY).filter(([, p]) => p.aplica).map(([k]) => k);
    expect(si).toEqual(["confirmation", "reminder48", "dayOf", "modified", "review"]);
    for (const k of ["rejected", "canceled", "trip-request", "payment-link", "payment-received", "internal"] as const) {
      expect(buildEmailCrossSell(input({ email: k }))).toBeNull();
    }
  });
});

describe("REQ-263 solo productos que no son de FREETOUR, misma ciudad y fecha, reglas del carrito", () => {
  it("REQ-263 nunca un tour de FREETOUR; sin origen cuenta como FREETOUR (falla cerrada)", () => {
    const b = buildEmailCrossSell(input())!;
    expect(b.cards.map((c) => c.title)).not.toContain("Free tour por el centro");
    const sinOrigen = { ...ownTour, source: undefined, title: "Sin origen" };
    expect(buildEmailCrossSell(input({ candidates: [sinOrigen] }))).toBeNull();
  });
  it("REQ-263 solo traslados, transporte, eSIM y tours propios o de otros proveedores", () => {
    const seguro = { ...transfer, category: "insurance" as never, title: "Seguro" };
    expect(buildEmailCrossSell(input({ candidates: [seguro] }))).toBeNull();
  });
  it("REQ-263 misma fecha: un producto sin salida ese día no entra; el traslado (cualquier fecha) sí", () => {
    const b = buildEmailCrossSell(input({ context: { ...input().context, day: "2026-11-21" } }))!;
    expect(b.cards.map((c) => c.category).sort()).toEqual(["transfer", "transport"]);
  });
  it("REQ-263 reglas del carrito: una tarjeta por categoría, máx. 3, el tour primero y la prioridad de Perú", () => {
    const otroBus = { ...bus, title: "Otro bus", url: "/viajes/otro-bus" };
    const b = buildEmailCrossSell(input({ candidates: [transfer, bus, otroBus, ownTour, ftTour] }))!;
    expect(b.cards.map((c) => c.category)).toEqual(["tour", "transport", "transfer"]);
    expect(b.cards).toHaveLength(3);
  });
  it("REQ-263 sin tour también hay bloque (el correo no exige la primera tarjeta de tour)", () => {
    expect(buildEmailCrossSell(input({ candidates: [transfer] }))?.cards.map((c) => c.category)).toEqual(["transfer"]);
  });
  it("REQ-263 sin ciudad o sin fecha no hay bloque", () => {
    expect(buildEmailCrossSell(input({ context: { ...input().context, cityName: null } }))).toBeNull();
    expect(buildEmailCrossSell(input({ context: { ...input().context, day: null } }))).toBeNull();
  });
  it("REQ-263 enlaces fuera del sitio se descartan (nada directo a terceros)", () => {
    expect(buildEmailCrossSell(input({ candidates: [{ ...transfer, url: "https://kiwitaxi.com/x" }] }))).toBeNull();
    expect(buildEmailCrossSell(input({ candidates: [{ ...transfer, url: "http://travelpuzzle.com.mx/traslados" }] }))).toBeNull();
  });
});

describe("REQ-264 bandera EMAIL_CROSS_SELL_ENABLED", () => {
  it("REQ-264 solo \"true\" exacto la enciende; wrangler.jsonc la trae en \"false\"", () => {
    expect(crossSellEnabled({})).toBe(false);
    expect(crossSellEnabled({ EMAIL_CROSS_SELL_ENABLED: "TRUE" })).toBe(false);
    expect(crossSellEnabled({ EMAIL_CROSS_SELL_ENABLED: "true" })).toBe(true);
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"EMAIL_CROSS_SELL_ENABLED":\s*"(true|false)"/);
  });
  it("REQ-264 apagada no hay bloque ni HTML ni texto", () => {
    const b = buildEmailCrossSell(input({ enabled: false }));
    expect(b).toBeNull();
    expect(renderCrossSellHtml(b)).toBe("");
    expect(crossSellText(b)).toEqual([]);
  });
});

describe("REQ-265 UTM por correo", () => {
  it("REQ-265 cada enlace lleva utm_source, utm_medium, utm_campaign por correo y utm_content por categoría", () => {
    const b = buildEmailCrossSell(input({ email: "reminder48" }))!;
    for (const c of b.cards) {
      const u = new URL(c.url);
      expect(u.origin).toBe(SITE);
      expect(Object.fromEntries(u.searchParams)).toMatchObject({ utm_source: "travelpuzzle", utm_medium: "email", utm_campaign: "venta-cruzada-reminder48", utm_content: c.category });
    }
  });
  it("REQ-265 conserva los parámetros que ya tenía el enlace", () => {
    expect(withUtm("/traslados?ciudad=lima", SITE, "review", "transfer")).toBe(`${SITE}/traslados?ciudad=lima&utm_source=travelpuzzle&utm_medium=email&utm_campaign=venta-cruzada-review&utm_content=transfer`);
  });
});

describe("REQ-266 sin descuentos ni precios inventados", () => {
  it("REQ-266 el precio sale tal cual del producto o no se muestra", () => {
    const b = buildEmailCrossSell(input())!;
    expect(b.cards.find((c) => c.category === "transport")?.priceLabel).toBe("Desde $450 MXN");
    expect(b.cards.find((c) => c.category === "transfer")?.priceLabel).toBeNull();
  });
  it("REQ-266 un producto que anuncia descuento u oferta no entra, y el copy del bloque no los usa", () => {
    expect(buildEmailCrossSell(input({ candidates: [{ ...transfer, title: "Traslado con 20% de descuento" }] }))).toBeNull();
    for (const lang of ["es", "en"] as const) {
      const b = buildEmailCrossSell(input({ lang }))!;
      expect(PROMO_WORDS.test(`${b.title} ${b.intro} ${b.optOut ?? ""} ${b.cta} ${b.cards.map((c) => c.chargedByLabel).join(" ")}`)).toBe(false);
    }
  });
});

describe("REQ-267 informativo; decisión del PO (6-11 09:07): sin lista «No publicidad»", () => {
  it("REQ-267 por omisión no se exige la negativa: sin forma de consultarla también hay bloque, y no promete un mecanismo", () => {
    const b = buildEmailCrossSell(input({ optedOut: null }))!;
    expect(b.cards.length).toBeGreaterThan(0);
    expect(b.optOut).toBeNull();
    expect(renderCrossSellHtml(b)).not.toContain("No publicidad");
    expect(crossSellText(b).join("\n")).not.toContain("No publicidad");
  });
  it("REQ-267 reversible: con requireOptOut vuelve la regla anterior (falla cerrada y línea de negativa)", () => {
    expect(buildEmailCrossSell(input({ optedOut: null, requireOptOut: true }))).toBeNull();
    expect(buildEmailCrossSell(input({ optedOut: true, requireOptOut: true }))).toBeNull();
    expect(buildEmailCrossSell(input({ optedOut: false, requireOptOut: true }))?.optOut).toContain("No publicidad");
  });
  it("REQ-267 el bloque dice que cada cosa se reserva aparte con quien la vende", () => {
    const b = buildEmailCrossSell(input({ requireOptOut: true }))!;
    expect(b.optOut).toContain("No publicidad");
    expect(b.intro).toContain("se reserva aparte");
    expect(b.cards.find((c) => c.category === "transfer")?.chargedByLabel).toBe("Lo reservas con Kiwitaxi");
    const html = renderCrossSellHtml(b);
    expect(html).toContain('data-bloque="venta-cruzada"');
    expect(html).toContain("No publicidad");
    expect(html).not.toMatch(/<img[^>]+width="1"|pixel/i);
  });
});
