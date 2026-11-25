// REQ-10874: consulta de /api/precio-local validada antes de convertir. npx vitest run src/ficha/schemas/local-price-query.test.ts
import { describe, expect, it } from "vitest";
import { localPriceUrl, parseLocalPriceQuery } from "./local-price-query";

describe("REQ-10874: consulta de precio local (Zod) y liga que arma la ficha", () => {
  it("REQ-10874: lee monto, moneda, «por» e idioma; «por» e idioma tienen valor por omisión", () => {
    expect(parseLocalPriceQuery(new URLSearchParams("amount=98&currency=usd&per=group&lang=en"))).toEqual({ price: { amount: 98, currency: "USD", per: "group" }, lang: "en" });
    expect(parseLocalPriceQuery({ amount: "12.5", currency: "EUR" })).toEqual({ price: { amount: 12.5, currency: "EUR", per: "person" }, lang: "es" });
    expect(parseLocalPriceQuery({ amount: ["0"], currency: ["MXN"] })!.price.amount).toBe(0);
  });

  it("REQ-10874: rechaza monto negativo, no numérico o desmedido, moneda que no es ISO 4217, «por» o idioma inválidos", () => {
    expect(parseLocalPriceQuery(new URLSearchParams("amount=-1&currency=USD"))).toBeNull();
    expect(parseLocalPriceQuery(new URLSearchParams("amount=abc&currency=USD"))).toBeNull();
    expect(parseLocalPriceQuery(new URLSearchParams("amount=1e12&currency=USD"))).toBeNull();
    expect(parseLocalPriceQuery(new URLSearchParams("amount=1&currency=US"))).toBeNull();
    expect(parseLocalPriceQuery(new URLSearchParams("amount=1&currency=USD&per=night"))).toBeNull();
    expect(parseLocalPriceQuery(new URLSearchParams("amount=1&currency=USD&lang=ru"))).toBeNull();
    expect(parseLocalPriceQuery(new URLSearchParams("currency=USD"))).toBeNull();
  });

  it("REQ-10874: la liga lleva lo mismo que lee la ruta y la ruta la acepta tal cual (ida y vuelta)", () => {
    const url = localPriceUrl({ amount: 98, currency: "USD", per: "person" }, "pt");
    expect(url).toBe("/api/precio-local?amount=98&currency=USD&per=person&lang=pt");
    expect(parseLocalPriceQuery(new URL(url, "https://travelpuzzle.com.mx").searchParams)).toEqual({ price: { amount: 98, currency: "USD", per: "person" }, lang: "pt" });
  });
});
