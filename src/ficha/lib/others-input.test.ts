// REQ-10862: filas de `Tour` de la misma ciudad → tarjetas de pago y gratis del bloque 20. npx vitest run src/ficha/lib/others-input.test.ts
import { describe, expect, it } from "vitest";
import { otherLocalUrl, otherCardsFrom, type OtherTourRow } from "./others-input";

const row = (over: Partial<OtherTourRow> = {}): OtherTourRow => ({
  id: "t-1",
  slug: "city-tour",
  providerId: "tangol",
  priceValue: 45,
  priceCurrency: "USD",
  titleImageURL: "https://img.example/1.jpg",
  reviewsNumber: 120,
  translations: [{ language: "es", title: "City tour por Buenos Aires" }, { language: "en", title: "Buenos Aires city tour" }],
  city: { slug: "buenos-aires" },
  country: { iso2: "AR" },
  ...over,
});
const rates = { USD: 20, EUR: 22, date: "2026-11-22" };

describe("REQ-10862: tarjetas de «Otras experiencias en la ciudad» desde las filas de la ciudad", () => {
  it("REQ-10862: separa de pago y gratis, arma la ruta pública y el precio público «Desde»; la gratis dice Gratis", () => {
    const r = otherCardsFrom([row(), row({ id: "t-2", slug: "free-walk", providerId: "freetour", priceValue: 0, priceCurrency: "EUR", reviewsNumber: 900 })], { lang: "es", excludeId: "x", rates });
    expect(r.paid).toHaveLength(1);
    expect(r.free).toHaveLength(1);
    expect(r.paid[0]).toMatchObject({ id: "t-1", title: "City tour por Buenos Aires", href: "/destinos/ar/buenos-aires/city-tour", provider: "tangol", imageUrl: "https://img.example/1.jpg" });
    expect(r.paid[0].priceText).toBe("Desde USD $45");
    expect(r.free[0]).toMatchObject({ id: "t-2", href: "/destinos/ar/buenos-aires/free-walk", provider: "freetour", priceText: "Gratis" });
  });

  it("REQ-10862: en inglés usa el título en inglés y «From» / «Free»", () => {
    const r = otherCardsFrom([row(), row({ id: "t-2", priceValue: 0 })], { lang: "en", excludeId: "x", rates });
    expect(r.paid[0].title).toBe("Buenos Aires city tour");
    expect(r.paid[0].priceText).toBe("From USD $45");
    expect(r.free[0].priceText).toBe("Free");
  });

  it("REQ-10862: fuera la propia ficha, lo sin foto https, sin título o sin ruta; precio en moneda sin cambio sale tal cual, nunca inventado", () => {
    const r = otherCardsFrom([
      row({ id: "yo" }),
      row({ id: "t-3", titleImageURL: "http://inseguro/1.jpg" }),
      row({ id: "t-4", titleImageURL: null }),
      row({ id: "t-5", translations: [] }),
      row({ id: "t-6", slug: null }),
      row({ id: "t-7", country: { iso2: null } }),
      row({ id: "t-8", priceValue: "1500", priceCurrency: "ARS" }),
    ], { lang: "es", excludeId: "yo", rates });
    expect(r.paid.map((c) => c.id)).toEqual(["t-8"]);
    expect(r.paid[0].priceText).toBe("Desde ARS 1500");
    expect(r.free).toEqual([]);
  });

  it("REQ-10862: el título sale sin el nombre de la plataforma (REQ-1246) y conserva el orden en que llegan las filas", () => {
    const r = otherCardsFrom([
      row({ id: "a", priceValue: 0, translations: [{ language: "es", title: "Free tour por el centro | Freetour.com" }] }),
      row({ id: "b", priceValue: 0, translations: [{ language: "es", title: "Barrio de La Boca" }] }),
    ], { lang: "es", excludeId: "x", rates: null });
    expect(r.free.map((c) => c.id)).toEqual(["a", "b"]);
    expect(r.free[0].title).not.toMatch(/freetour\.com/i);
  });
});

describe("REQ-10893: «Desde» en la moneda del visitante en las tarjetas de otras experiencias", () => {
  it("REQ-10893: con la moneda local, cada tarjeta con precio lleva localUrl y el HTML sigue en la moneda del proveedor; gratis o apagada, sin ruta", () => {
    const filas = [row(), row({ id: "t-2", slug: "free-walk", providerId: "freetour", priceValue: 0, priceCurrency: "EUR" }), row({ id: "t-3", slug: "eur-tour", providerId: "freetour", priceValue: 38, priceCurrency: "EUR" })];
    const on = otherCardsFrom(filas, { lang: "es", excludeId: "x", rates, localCurrency: true });
    expect(on.paid.map((c) => [c.priceText, c.localUrl])).toEqual([
      ["Desde USD $45", "/api/precio-local?amount=45&currency=USD&per=person&lang=es"],
      ["Desde EUR €38", "/api/precio-local?amount=38&currency=EUR&per=person&lang=es"],
    ]);
    expect(on.free[0].localUrl).toBeNull();
    const off = otherCardsFrom(filas, { lang: "es", excludeId: "x", rates });
    expect(off.paid.map((c) => c.localUrl)).toEqual([null, null]);
    expect(otherLocalUrl(38, "eur", { lang: "en", localCurrency: true })).toBe("/api/precio-local?amount=38&currency=EUR&per=person&lang=en");
    expect(otherLocalUrl(38, "", { lang: "es", localCurrency: true })).toBeNull();
    expect(otherLocalUrl(38, "€", { lang: "es", localCurrency: true })).toBeNull();
  });
});
