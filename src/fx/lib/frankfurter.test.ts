// REQ-10874: Frankfurter (BCE) complementa a Banxico (REQ-10767). npx vitest run src/fx/lib/frankfurter.test.ts
import { describe, expect, it } from "vitest";
import { mergeFxTables, parseFrankfurter } from "./frankfurter";

const frank = { amount: 1, base: "EUR", date: "2026-11-24", rates: { USD: 1.1, MXN: 20, ARS: 1100, BRL: 6, GBP: 0.85 } };
const banxico = { USD: 18.5, EUR: 21, date: "2026-11-24" };

describe("REQ-10874: tipos de cambio de Frankfurter (BCE) y su mezcla con Banxico (REQ-10767)", () => {
  it("REQ-10874: `parseFrankfurter` lee base, fecha y tasas positivas; lo malo da null", () => {
    expect(parseFrankfurter(frank)).toEqual({ base: "EUR", date: "2026-11-24", rates: frank.rates });
    expect(parseFrankfurter({ base: "EUR", date: "2026-11-24", rates: { USD: -1, MXN: "20" } })).toEqual({ base: "EUR", date: "2026-11-24", rates: {} });
    expect(parseFrankfurter({ base: "EUR", rates: { USD: 1.1 } })).toBeNull();
    expect(parseFrankfurter({ date: "2026-11-24", rates: { USD: 1.1 } })).toBeNull();
    expect(parseFrankfurter(null)).toBeNull();
    expect(parseFrankfurter("x")).toBeNull();
  });

  it("REQ-10874: con las dos fuentes, Banxico manda para MXN/USD/EUR y Frankfurter aporta las demás monedas (base MXN)", () => {
    const t = mergeFxTables(banxico, parseFrankfurter(frank));
    expect(t).not.toBeNull();
    expect(t!.base).toBe("MXN");
    expect(t!.date).toBe("2026-11-24");
    // 1 MXN = 1/18.5 USD y 1/21 EUR (Banxico), no 1.1/20 ni 1/20 (Frankfurter).
    expect(t!.rates.USD).toBeCloseTo(1 / 18.5, 10);
    expect(t!.rates.EUR).toBeCloseTo(1 / 21, 10);
    // 1 MXN = (1/21) EUR = 1100/21 ARS.
    expect(t!.rates.ARS).toBeCloseTo(1100 / 21, 10);
    expect(t!.rates.BRL).toBeCloseTo(6 / 21, 10);
    expect(t!.rates.GBP).toBeCloseTo(0.85 / 21, 10);
    expect(t!.rates.MXN).toBeUndefined();
  });

  it("REQ-10874: sin Banxico, Frankfurter solo (base EUR, con MXN y USD de ahí); sin Frankfurter, Banxico solo (USD y EUR)", () => {
    const soloFrank = mergeFxTables(null, parseFrankfurter(frank));
    expect(soloFrank).toEqual({ base: "EUR", date: "2026-11-24", rates: frank.rates });
    const soloBanxico = mergeFxTables(banxico, null);
    expect(soloBanxico!.base).toBe("MXN");
    expect(Object.keys(soloBanxico!.rates).sort()).toEqual(["EUR", "USD"]);
    expect(mergeFxTables(null, null)).toBeNull();
  });

  it("REQ-10874: con Banxico sin EUR válido no se derivan las demás monedas (sin dato no se convierte, REQ-10823)", () => {
    const t = mergeFxTables({ USD: 18.5, EUR: 0, date: "2026-11-24" }, parseFrankfurter(frank));
    expect(t!.rates.USD).toBeCloseTo(1 / 18.5, 10);
    expect(t!.rates.EUR).toBeUndefined();
    expect(t!.rates.ARS).toBeUndefined();
  });
});
