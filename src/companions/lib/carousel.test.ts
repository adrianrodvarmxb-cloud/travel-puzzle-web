import { describe, expect, it } from "vitest";
import { buildCarousel, DEFAULT_RULES, parseRules, BASE_ORDER, type CarouselCandidate, type CarouselContext } from "./carousel";
import type { CartItemType } from "@/cart/lib/item";

const NOW = Date.parse("2026-12-01T12:00:00Z");
const ALL: CartItemType[] = ["tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "lodging", "car_rental", "visa"];

const cand = (type: CartItemType, kind: "book" | "deeplink" | "whatsapp" = "deeplink", chargedBy = "Civitatis"): CarouselCandidate => ({
  type, title: `T ${type}`, chargedBy,
  action: kind === "whatsapp" ? { kind, label: "Te lo cotiza tu asesor por WhatsApp", url: "https://wa.me/x" }
    : kind === "book" ? { kind, label: "Reservar", adapterId: "a" } : { kind, label: "Ver opciones", url: "https://p", adapterId: "a" },
});

const ctx = (o: Partial<CarouselContext> = {}): CarouselContext => ({
  country: "ES", cityCode: "es-madrid", travelerCountry: "MX", freeTourAt: "2026-12-20T10:00:00Z", now: NOW, ...o,
});
const types = (cards: { type: string }[]) => cards.map((c) => c.type);
const build = (o: Partial<CarouselContext> = {}, device: "mobile" | "desktop" = "desktop", candidates = ALL.map((t) => cand(t)), flags = {}) =>
  buildCarousel({ candidates, context: ctx(o), device, rules: DEFAULT_RULES, flags });

describe("Carrusel de acompañamiento", () => {
  it("REQ-108: máximo 3 tarjetas en móvil y 4 en escritorio; móvil es el inicio de escritorio", () => {
    const m = build({}, "mobile");
    const d = build({}, "desktop");
    expect(m).toHaveLength(3);
    expect(d).toHaveLength(4);
    expect(types(d).slice(0, 3)).toEqual(types(m));
  });

  it("REQ-108: orden base tour → traslado → eSIM → tickets → seguro → transporte → alojamiento al final", () => {
    expect(BASE_ORDER).toEqual(["tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "car_rental", "lodging"]);
    const only = (ts: CartItemType[]) => build({}, "desktop", ts.map((t) => cand(t)));
    expect(types(only(["lodging", "transport", "insurance", "tour"]))).toEqual(["tour", "insurance", "transport", "lodging"]);
    expect(types(only(["tickets", "esim", "transfer", "tour"]))).toEqual(["tour", "transfer", "esim", "tickets"]);
  });

  it("REQ-108: categorías distintas (tour y tour de día cuentan como una)", () => {
    const d = build({}, "desktop", [cand("tour"), cand("tour"), cand("day_trip"), cand("esim"), cand("esim"), cand("transfer")]);
    expect(types(d)).toEqual(["tour", "transfer", "esim"]);
  });

  it("REQ-108: la primera siempre es un tour de pago o de día; sin tour no hay carrusel", () => {
    expect(build({}, "desktop", [cand("esim"), cand("day_trip")])[0].type).toBe("day_trip");
    expect(build({}, "desktop", [cand("esim"), cand("transfer")])).toEqual([]);
  });

  it("REQ-108: cada tarjeta dice quién cobra", () => {
    const d = build({}, "desktop", [cand("tour", "book", "Travel Puzzle"), cand("transfer", "deeplink", "Kiwitaxi"), cand("esim", "whatsapp")]);
    expect(d.map((c) => c.chargedByLabel)).toEqual([
      "Lo reservas con Travel Puzzle", "Lo reservas con Kiwitaxi", "Te lo cotiza tu asesor de Travel Puzzle",
    ]);
  });

  it("REQ-108: nada viene preseleccionado", () => {
    expect(build().every((c) => c.selected === false)).toBe(true);
  });

  it("REQ-109: free tour en <72 h: lo inmediato primero y sin alojamiento", () => {
    const soon = build({ freeTourAt: "2026-12-03T10:00:00Z" }, "desktop", [cand("lodging"), cand("insurance"), cand("tickets"), cand("esim"), cand("transfer"), cand("day_trip")]);
    expect(types(soon)).toEqual(["day_trip", "transfer", "esim", "tickets"]);
    const soonFew = build({ freeTourAt: "2026-12-03T10:00:00Z" }, "desktop", [cand("lodging"), cand("tour")]);
    expect(types(soonFew)).toEqual(["tour"]);
    // a 72 h exactas o más ya no aplica
    expect(types(build({ freeTourAt: "2026-12-04T12:00:00Z" }, "desktop", [cand("lodging"), cand("tour")]))).toEqual(["tour", "lodging"]);
  });

  it("REQ-109: México con viajero en México: sin eSIM ni seguro internacional", () => {
    const mx = build({ country: "MX", cityCode: "mx-cdmx", travelerCountry: "MX" });
    expect(types(mx)).not.toContain("esim");
    expect(types(mx)).not.toContain("insurance");
    const foreign = build({ country: "MX", cityCode: "mx-cdmx", travelerCountry: "US" });
    expect(types(foreign)).toContain("esim");
  });

  it("REQ-109: China: eSIM primero (después del tour) y la visa se oculta en <72 h", () => {
    const flags = { visa: true };
    const cn = build({ country: "CN", cityCode: "cn-beijing" }, "desktop", ALL.map((t) => cand(t)), flags);
    expect(types(cn).slice(0, 2)).toEqual(["tour", "esim"]);
    const withVisa = build({ country: "CN", cityCode: "cn-beijing" }, "desktop", [cand("tour"), cand("visa")], flags);
    expect(types(withVisa)).toContain("visa");
    const soon = build({ country: "CN", cityCode: "cn-beijing", freeTourAt: "2026-12-02T10:00:00Z" }, "desktop", [cand("tour"), cand("visa")], flags);
    expect(types(soon)).not.toContain("visa");
  });

  it("REQ-109: Perú: excursiones, tickets y tren primero", () => {
    const pe = build({ country: "PE", cityCode: "pe-cusco" }, "desktop", [cand("tour"), cand("transfer"), cand("esim"), cand("tickets"), cand("transport"), cand("day_trip")]);
    expect(types(pe)).toEqual(["day_trip", "tickets", "transport", "transfer"]);
  });

  it("REQ-109: visa y ETIAS ocultas con las banderas apagadas", () => {
    const off = build({ country: "FR", cityCode: "fr-paris" }, "desktop", [cand("tour"), cand("visa"), { ...cand("visa"), category: "etias" }]);
    expect(types(off)).toEqual(["tour"]);
    const on = build({ country: "FR", cityCode: "fr-paris" }, "desktop", [cand("tour"), cand("visa"), { ...cand("visa"), category: "etias" }], { visa: true, etias: true });
    expect(on.map((c) => c.category)).toEqual(["tour", "visa", "etias"]);
  });

  it("REQ-109: las reglas se configuran como datos (JSON) sin código por país", () => {
    const rules = parseRules([{ id: "jp", when: { country: ["JP"] }, priority: ["transport"] }]);
    const jp = buildCarousel({ candidates: [cand("tour"), cand("esim"), cand("transport")], context: ctx({ country: "JP", cityCode: "jp-tokyo" }), device: "desktop", rules, flags: {} });
    expect(types(jp)).toEqual(["tour", "transport", "esim"]);
    expect(() => parseRules([{ id: "x", when: {}, priority: ["helicoptero"] }])).toThrow();
  });

  it("REQ-108: una categoría sin acción (sin inventario ni asesor) no se muestra", () => {
    const d = build({}, "desktop", [cand("tour"), { ...cand("esim"), action: null }]);
    expect(types(d)).toEqual(["tour"]);
  });
});
