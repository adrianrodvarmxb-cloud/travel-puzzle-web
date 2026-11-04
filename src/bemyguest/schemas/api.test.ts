// REQ-024 — lo que llega de BeMyGuest se valida; un registro malo se descarta sin tumbar el resto.
import { describe, expect, it, vi } from "vitest";
import products from "../fixtures/products.json";
import product from "../fixtures/product.json";
import productType from "../fixtures/product-type.json";
import priceDay from "../fixtures/price-list-date.json";
import { parseList, priceDaySchema, productSchema, productSummarySchema, productTypeSchema } from "./api";

describe("esquemas BeMyGuest (ejemplos oficiales del OpenAPI)", () => {
  it("REQ-024: acepta las respuestas de ejemplo de su documentación", () => {
    expect(parseList(productSummarySchema, products.data)).toHaveLength(products.data.length);
    expect(productSchema.parse(product.data).locations[0]).toEqual({ city: "Kuala Lumpur", country: "Malaysia" });
    // Su ejemplo de product-type viene sin uuid ni title: se rechaza; con los datos de la lista, pasa.
    expect(productTypeSchema.safeParse(productType.data).success).toBe(false);
    const fixed = { ...productType.data, uuid: "80590844-e665-4fdc-843c-ffc6fe893403", title: "MINT Museum of Toys - Admission" };
    expect(productTypeSchema.parse(fixed).isNonRefundable).toBe(true);
    expect(priceDaySchema.parse(priceDay.data).prices[0].rates.length).toBeGreaterThan(0);
  });

  it("REQ-024: descarta el registro malo, conserva los buenos y lo reporta", () => {
    const bad = vi.fn();
    const list = parseList(productSummarySchema, [products.data[0], { title: "sin uuid" }, products.data[1]], bad);
    expect(list.map((p) => p.uuid)).toEqual([products.data[0].uuid, products.data[1].uuid]);
    expect(bad).toHaveBeenCalledWith(1, expect.any(String));
  });

  it("REQ-024: si no es lista devuelve vacío", () => {
    expect(parseList(productSummarySchema, null)).toEqual([]);
  });
});
