import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { crossSellEnabled, REQUIRE_NO_PUBLICIDAD } from "./lib/cross-sell";

describe("REQ-1632: venta cruzada en correos, encendida en producción (REQ-264)", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");
  it("REQ-1632: wrangler.jsonc enciende EMAIL_CROSS_SELL_ENABLED y su requisito EMAILS_ENABLED sigue encendido", () => {
    expect(wrangler).toMatch(/"EMAIL_CROSS_SELL_ENABLED": "true"/);
    expect(wrangler).toMatch(/"EMAILS_ENABLED": "true"/);
    expect(crossSellEnabled({ EMAIL_CROSS_SELL_ENABLED: "true" })).toBe(true);
  });
  it("REQ-1632: la regla sigue siendo la decisión del PO del 6 nov: solo no promover FREETOUR, sin exigir la lista «No publicidad»", () => {
    expect(REQUIRE_NO_PUBLICIDAD).toBe(false);
  });
});
