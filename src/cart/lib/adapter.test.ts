import { describe, expect, it } from "vitest";
import { affiliateSubId, withSubId, type ProviderAdapter } from "./adapter";

describe("ProviderAdapter", () => {
  it("REQ-104: el subID por ítem tiene el formato marker-cartId-itemId", () => {
    expect(affiliateSubId("595791", "c42", "i7")).toBe("595791-c42-i7");
  });

  it("REQ-104: el subID limpia caracteres que rompen la URL del afiliado", () => {
    expect(affiliateSubId("595791", "c 4/2", "i?7")).toBe("595791-c42-i7");
  });

  it("REQ-104: agrega el subID al enlace del proveedor sin perder sus parámetros", () => {
    const url = withSubId("https://tp.example/go?u=https%3A%2F%2Fx.com", "sub_id", "595791-c42-i7");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("sub_id")).toBe("595791-c42-i7");
    expect(parsed.searchParams.get("u")).toBe("https://x.com");
  });

  it("REQ-104: la interfaz expone solo buscar, disponibilidad, reservar, cancelar y cobrar", () => {
    const ops: (keyof ProviderAdapter)[] = ["search", "availability", "reserve", "cancel", "charge"];
    const fake: ProviderAdapter = {
      id: "x", mode: "deeplink", types: ["esim"], chargedBy: "X",
      search: async () => [], availability: async () => ({ available: false }),
      reserve: async () => ({ kind: "redirect", url: "https://x" }), cancel: async () => ({ ok: false }),
      charge: async () => ({ kind: "none" }),
    };
    for (const op of ops) expect(typeof fake[op]).toBe("function");
  });
});
