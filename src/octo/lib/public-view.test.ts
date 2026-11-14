import { describe, it, expect } from "vitest";
import { bigBusRefForTrip, buildPurchaseBody, plainPrice, publicCalendar, publicCity, purchaseErrorMessage } from "./public-view";
import { buildCatalogPlan } from "./catalog";
import { calendarDaySchema, productSchema } from "./schemas";
import { sampleProduct } from "./fixtures";

describe("vista pública de la compra directa", () => {
  it("REQ-3423: el calendario lleva fecha, si se vende y el retail; nunca el net", () => {
    const days = [
      calendarDaySchema.parse({ localDate: "2026-12-01", available: true, status: "FREESALE", vacancies: null, capacity: null, pricingFrom: { original: 4900, retail: 4900, net: 3920, currency: "USD", currencyPrecision: 2 } }),
      calendarDaySchema.parse({ localDate: "2026-12-25", available: false, status: "CLOSED", vacancies: null, capacity: null }),
    ];
    const out = publicCalendar(days);
    expect(out).toEqual([
      { date: "2026-12-01", available: true, from: { amount: 49, currency: "USD" } },
      { date: "2026-12-25", available: false, from: null },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/net|39\.2/);
  });

  it("REQ-3423: la ciudad sale del plan; sin plan o sin ciudad, null", () => {
    const plan = buildCatalogPlan([productSchema.parse({ ...sampleProduct(), internalName: "New York Discover" })], ["NYC"], { NYC: ["new york"] }, new Date());
    expect(publicCity(plan, "NYC")?.products[0].productId).toBe("prod-hoho-nyc");
    expect(publicCity(plan, "LON")).toBeNull();
    expect(publicCity(null, "NYC")).toBeNull();
  });

  it("REQ-3423: cada rechazo tiene mensaje claro y su código HTTP", () => {
    expect(purchaseErrorMessage("sold_out")).toEqual({ status: 409, message: "Ya no hay lugares para esa fecha. Elige otra." });
    expect(purchaseErrorMessage("disabled").status).toBe(404);
    expect(purchaseErrorMessage("stripe_error").status).toBe(502);
  });
});

describe("caja de compra de Big Bus", () => {
  it("REQ-3423: solo los viajes cargados de Big Bus llevan caja de compra", () => {
    expect(bigBusRefForTrip("bbt-nyc", ["NYC"])).toBe("NYC");
    expect(bigBusRefForTrip("bbt-xyz", ["NYC"])).toBeNull();
    expect(bigBusRefForTrip("iwp-lim-01", ["NYC"])).toBeNull();
  });

  it("REQ-3423: arma el cuerpo de compra sin unidades en cero", () => {
    const body = buildPurchaseBody({
      ref: "NYC", productId: "p", optionId: "o", date: "2026-12-01", qty: { a: 2, c: 0 },
      firstName: " Ana ", lastName: "García", email: "ana@example.test ", phone: "5512345678", consent: true, language: "es",
    });
    expect(body.units).toEqual([{ id: "a", quantity: 2 }]);
    expect(body.firstName).toBe("Ana");
    expect(body.email).toBe("ana@example.test");
  });

  it("REQ-3423: precio sin formato de idioma (render determinista)", () => {
    expect(plainPrice({ amount: 49, currency: "USD" })).toBe("USD 49");
    expect(plainPrice({ amount: 49.5, currency: "USD" })).toBe("USD 49.50");
    expect(plainPrice(null)).toBe("");
  });
});
