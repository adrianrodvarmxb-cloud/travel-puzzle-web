import { describe, expect, it } from "vitest";
import { convert, formatAmount, localPrice, visitorCurrency, type FxTable } from "./local-price";

const fx: FxTable = { base: "EUR", date: "2026-11-20", rates: { USD: 1.1, MXN: 20, ARS: 1100, EUR: 1 } };
const usd = { amount: 98, currency: "USD", per: "person" as const };

describe("REQ-10823: precio en la moneda del visitante y moneda del cargo (decisión 32)", () => {
  it("REQ-10823: el país del visitante da su moneda; desconocido o vacío da null", () => {
    expect(visitorCurrency("MX")).toBe("MXN");
    expect(visitorCurrency("ar")).toBe("ARS");
    expect(visitorCurrency("DE")).toBe("EUR");
    expect(visitorCurrency("XX")).toBeNull();
    expect(visitorCurrency(null)).toBeNull();
  });

  it("REQ-10823: convierte por tabla con base y redondea hacia arriba; sin tasa no convierte", () => {
    expect(convert(100, "EUR", "MXN", fx)).toBe(2000);
    expect(convert(98, "USD", "MXN", fx)).toBe(Math.ceil((98 / 1.1) * 20));
    expect(convert(98, "USD", "USD", fx)).toBe(98);
    expect(convert(98, "USD", "BRL", fx)).toBeNull();
    expect(convert(98, "USD", "MXN", null)).toBeNull();
  });

  it("REQ-10823: visitante mexicano ve pesos aproximados y siempre la moneda del cargo", () => {
    const p = localPrice(usd, { visitorCountry: "MX", fx, lang: "es" });
    expect(p).toEqual({
      shown: { amount: 1782, currency: "MXN", approx: true },
      charge: { amount: 98, currency: "USD" },
      text: "MXN $1,782 aprox. por persona · se cobra en USD $98",
    });
  });

  it("REQ-10823: misma moneda del visitante y del proveedor: sin conversión ni «aprox.»", () => {
    const p = localPrice(usd, { visitorCountry: "US", fx, lang: "en" });
    expect(p.shown).toEqual({ amount: 98, currency: "USD", approx: false });
    expect(p.text).toBe("USD $98 per person · charged in USD");
  });

  it("REQ-10823: sin tipo de cambio o sin país, manda la moneda del proveedor y se dice la del cargo", () => {
    expect(localPrice(usd, { visitorCountry: "MX", fx: null, lang: "es" }).text).toBe("USD $98 por persona · se cobra en USD");
    expect(localPrice(usd, { visitorCountry: null, fx, lang: "es" }).shown.currency).toBe("USD");
    expect(localPrice(usd, { visitorCountry: "BR", fx, lang: "es" }).shown.approx).toBe(false);
  });

  it("REQ-10823: precio por grupo y total, y gratis sin cobro", () => {
    expect(localPrice({ amount: 300, currency: "EUR", per: "group" }, { visitorCountry: "FR", fx, lang: "fr" }).text).toBe("EUR €300 par groupe · facturé en EUR");
    expect(localPrice({ amount: 0, currency: "EUR", per: "person" }, { visitorCountry: "MX", fx, lang: "es" })).toEqual({
      shown: { amount: 0, currency: "EUR", approx: false },
      charge: null,
      text: "Gratis",
    });
  });

  it("REQ-10874: moneda del visitante sin tasa → se muestra en USD aproximado (REQ-10767: «lo que no esté en ninguna se muestra en USD»)", () => {
    const eur = { amount: 100, currency: "EUR", per: "person" as const };
    const br = localPrice(eur, { visitorCountry: "BR", fx, lang: "es" }); // BRL no está en la tabla
    expect(br.shown).toEqual({ amount: 110, currency: "USD", approx: true });
    expect(br.text).toBe("USD $110 aprox. por persona · se cobra en EUR €100");
    // Sin tasa para USD tampoco: moneda del proveedor.
    const sinUsd = localPrice(eur, { visitorCountry: "BR", fx: { base: "EUR", date: "2026-11-20", rates: { MXN: 20 } }, lang: "es" });
    expect(sinUsd.shown).toEqual({ amount: 100, currency: "EUR", approx: false });
    // Sin país no se cambia nada: moneda del proveedor (el HTML en caché es igual para todos).
    expect(localPrice(eur, { visitorCountry: null, fx, lang: "es" }).shown.currency).toBe("EUR");
  });

  it("REQ-10823: formato sin Intl, con miles y hasta dos decimales", () => {
    expect(formatAmount(1782, "MXN", "es")).toBe("MXN $1,782");
    expect(formatAmount(12.5, "EUR", "en")).toBe("EUR €12.50");
    expect(formatAmount(1234567.891, "ARS", "es")).toBe("ARS $1,234,567.89");
    expect(formatAmount(50, "GBP", "en")).toBe("GBP £50");
    expect(formatAmount(50, "BRL", "en")).toBe("BRL 50");
  });
});
