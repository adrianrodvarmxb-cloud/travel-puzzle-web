import { describe, it, expect } from "vitest";
import { fromPrice, guestPrice, internalMargin, isFullyPriced, toMajor } from "./pricing";
import { productSchema } from "./schemas";
import { sampleProduct } from "./fixtures";

const product = () => productSchema.parse(sampleProduct());

describe("precios OCTO", () => {
  it("REQ-3327: unidades menores a importe según la precisión", () => {
    expect(toMajor(4900, 2)).toBe(49);
    expect(toMajor(12345, 0)).toBe(12345);
    expect(toMajor(1999, 2)).toBe(19.99);
  });

  it("REQ-3327: al cliente se le cobra el retail, nunca el net", () => {
    const p = { original: 4900, retail: 4900, net: 3920, currency: "USD", currencyPrecision: 2 };
    expect(guestPrice(p)).toEqual({ amount: 49, currency: "USD" });
    expect(JSON.stringify(guestPrice(p))).not.toContain("39.2");
    expect(internalMargin(p)).toBe(9.8);
    expect(internalMargin({ ...p, net: null })).toBeNull();
  });

  it("REQ-3327: el precio «desde» es el retail de adulto más bajo", () => {
    expect(fromPrice(product())).toEqual({ amount: 49, currency: "USD" });
  });

  it("REQ-3327: sin precio en todas las unidades, el producto no se vende directo", () => {
    expect(isFullyPriced(product())).toBe(true);
    const raw = sampleProduct() as { options: { units: { pricingFrom: unknown[] }[] }[] };
    raw.options[0].units[1].pricingFrom = [];
    expect(isFullyPriced(productSchema.parse(raw))).toBe(false);
  });
});
