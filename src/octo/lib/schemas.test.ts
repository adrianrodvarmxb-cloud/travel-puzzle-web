import { describe, it, expect, vi } from "vitest";
import { bookingSchema, parseEach, productSchema } from "./schemas";
import { sampleBooking, sampleProduct } from "./fixtures";

describe("esquemas OCTO", () => {
  it("REQ-3325: un producto válido pasa con sus opciones, unidades y precio «desde»", () => {
    const p = productSchema.parse(sampleProduct());
    expect(p.options[0].units.map((u) => u.type)).toEqual(["ADULT", "CHILD"]);
    expect(p.options[0].units[0].pricingFrom[0]).toMatchObject({ retail: 4900, currency: "USD", currencyPrecision: 2 });
    expect(p.deliveryMethods).toEqual(["VOUCHER"]);
  });

  it("REQ-3325: un producto malo se descarta y se cuenta; los buenos siguen", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = { ...sampleProduct(), options: [] };
    const r = parseEach(productSchema, [sampleProduct(), bad, null]);
    expect(r.items).toHaveLength(1);
    expect(r.discarded).toBe(2);
    expect(parseEach(productSchema, undefined)).toEqual({ items: [], discarded: 0 });
    warn.mockRestore();
  });

  it("REQ-3325: estados nuevos de Ventrata (NO_SHOW) no rompen la lectura de la reserva", () => {
    const b = bookingSchema.parse({ ...sampleBooking(), status: "NO_SHOW" });
    expect(b.status).toBe("NO_SHOW");
    expect(b.supplierReference).toBe("BB-K3RM568F");
  });
});
