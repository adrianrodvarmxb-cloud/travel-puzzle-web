import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { taxonomyCartEnabled } from "./lib/cart-type";

describe("REQ-1630: carrito por tipo encendido en producción (T7: REQ-428, REQ-429)", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");
  it("REQ-1630: wrangler.jsonc enciende TAXONOMY_CART_ENABLED y su requisito ARMA_TU_VIAJE_ENABLED sigue encendido", () => {
    expect(wrangler).toMatch(/"TAXONOMY_CART_ENABLED": "true"/);
    expect(wrangler).toMatch(/"ARMA_TU_VIAJE_ENABLED": "true"/);
    expect(taxonomyCartEnabled({ TAXONOMY_CART_ENABLED: "true" })).toBe(true);
  });
  it("REQ-1630: la prueba de humo visita /arma-tu-viaje", () => {
    expect(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")).fixed).toContain("/arma-tu-viaje");
  });
});
