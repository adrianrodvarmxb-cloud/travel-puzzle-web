import { describe, it, expect } from "vitest";
import { checkAgainstPlan, paxCounts, pickAvailability, purchaseInputSchema, purchaseTotal, stripeSessionExpiry, unitsText } from "./purchase";
import { buildCatalogPlan } from "./catalog";
import { availabilitySchema, productSchema } from "./schemas";
import { sampleProduct } from "./fixtures";

const plan = buildCatalogPlan([productSchema.parse({ ...sampleProduct(), internalName: "New York Discover" })], ["NYC"], { NYC: ["new york"] }, new Date("2026-11-12T00:00:00Z"));
const input = (over: Record<string, unknown> = {}) =>
  purchaseInputSchema.parse({
    ref: "NYC",
    productId: "prod-hoho-nyc",
    optionId: "DEFAULT",
    date: "2026-12-01",
    units: [{ id: "unit-adult", quantity: 2 }],
    firstName: "Ana",
    lastName: "García",
    email: "ana@example.test",
    phone: "5512345678",
    consent: true,
    ...over,
  });
const avail = (over: Record<string, unknown> = {}) =>
  availabilitySchema.parse({
    id: "2026-12-01T00:00:00-05:00",
    localDateTimeStart: "2026-12-01T00:00:00-05:00",
    localDateTimeEnd: "2026-12-01T23:59:00-05:00",
    utcCutoffAt: null,
    allDay: true,
    available: true,
    status: "FREESALE",
    vacancies: null,
    pricing: { original: 9800, retail: 9800, net: 7840, currency: "USD", currencyPrecision: 2, includedTaxes: [] },
    ...over,
  });

describe("compra directa: validar contra el plan", () => {
  it("REQ-3417: sin consentimiento o con correo inválido no pasa", () => {
    expect(() => input({ consent: false })).toThrow();
    expect(() => input({ email: "no-es-correo" })).toThrow();
  });

  it("REQ-3417: producto, opción y unidades deben estar en el plan vigente", () => {
    expect(checkAgainstPlan(input(), plan, "2026-11-12")).toMatchObject({ ok: true });
    expect(checkAgainstPlan(input({ ref: "LON" }), plan, "2026-11-12")).toEqual({ ok: false, code: "not_found" });
    expect(checkAgainstPlan(input({ optionId: "otra" }), plan, "2026-11-12")).toEqual({ ok: false, code: "not_found" });
    expect(checkAgainstPlan(input({ units: [{ id: "ajena", quantity: 1 }] }), plan, "2026-11-12")).toEqual({ ok: false, code: "bad_units" });
    expect(checkAgainstPlan(input({ units: [{ id: "unit-adult", quantity: 1 }, { id: "unit-adult", quantity: 1 }] }), plan, "2026-11-12")).toEqual({ ok: false, code: "bad_units" });
    expect(checkAgainstPlan(input(), null, "2026-11-12")).toEqual({ ok: false, code: "not_found" });
    expect(checkAgainstPlan(input({ date: "2026-11-01" }), plan, "2026-11-12")).toEqual({ ok: false, code: "past_date" });
  });
});

describe("compra directa: disponibilidad y total", () => {
  it("REQ-3417: elige la salida vendible del día con precio", () => {
    expect(pickAvailability([avail({ status: "SOLD_OUT", available: false }), avail({ id: "b" })], "2026-12-01")?.id).toBe("b");
    expect(pickAvailability([avail({ status: "CLOSED", available: false })], "2026-12-01")).toBeNull();
    expect(pickAvailability([avail()], "2026-12-02")).toBeNull();
  });

  it("REQ-3417: el total es el retail del día; monedas sin tipo de cambio no se cobran directo", () => {
    expect(purchaseTotal(avail())).toEqual({ ok: true, amount: 98, currency: "USD" });
    expect(purchaseTotal(avail({ pricing: { original: 5000, retail: 5000, net: 4000, currency: "GBP", currencyPrecision: 2, includedTaxes: [] } }))).toEqual({
      ok: false,
      code: "unsupported_currency",
    });
  });

  it("REQ-3418: la sesión de Stripe dura 31 minutos (mínimo de Stripe: 30)", () => {
    expect(stripeSessionExpiry(new Date("2026-11-12T10:00:00Z"))).toBe(Date.parse("2026-11-12T10:31:00Z") / 1000);
  });

  it("REQ-3417: personas por tipo para la solicitud y el correo", () => {
    const option = plan.cities[0].products[0].options[0];
    const units = [{ id: "unit-adult", quantity: 2 }, { id: "unit-child", quantity: 1 }];
    expect(paxCounts(option, units)).toEqual({ adults: 2, children: 1, infants: 0 });
    expect(unitsText(option, units)).toBe("2 Adult, 1 Child");
  });
});
