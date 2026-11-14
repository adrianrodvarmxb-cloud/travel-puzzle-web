import { describe, it, expect } from "vitest";
import { monthAvailability, fromDateRanges, fromFixedDates, type PriceRule } from "./date-availability";

const USD = "USD";
// Una temporada baja y una alta, con un bloqueo en medio.
const reglas: PriceRule[] = [
  { option: "REG", from: "2026-11-01", to: "2026-11-15", adult: 100, currency: USD },
  { option: "REG", from: "2026-11-16", to: "2026-11-30", adult: 180, currency: USD },
  { option: "PRIV", from: "2026-11-01", to: "2026-11-30", adult: 320, currency: USD },
];

describe("disponibilidad y precio por fecha (igual para todos los proveedores)", () => {
  it("REQ-3443: cada día del mes trae el precio más bajo de ese día", () => {
    const dias = monthAvailability({ rules: reglas, blackouts: [] }, "2026-11", { today: "2026-10-01" });
    expect(dias.find((d) => d.date === "2026-11-10")).toEqual({ date: "2026-11-10", bookable: true, from: 100, currency: USD });
    expect(dias.find((d) => d.date === "2026-11-20")).toEqual({ date: "2026-11-20", bookable: true, from: 180, currency: USD });
    expect(dias).toHaveLength(30);
  });

  it("REQ-3443: una fecha bloqueada no se ofrece y no trae precio", () => {
    const dias = monthAvailability({ rules: reglas, blackouts: [{ from: "2026-11-18", to: "2026-11-19" }] }, "2026-11", { today: "2026-10-01" });
    expect(dias.find((d) => d.date === "2026-11-18")).toEqual({ date: "2026-11-18", bookable: false, from: null, currency: null });
    expect(dias.find((d) => d.date === "2026-11-20")?.bookable).toBe(true);
  });

  it("REQ-3443: un día sin ninguna tarifa que lo cubra no se ofrece", () => {
    const dias = monthAvailability({ rules: [reglas[0]], blackouts: [] }, "2026-11", { today: "2026-10-01" });
    expect(dias.find((d) => d.date === "2026-11-25")?.bookable).toBe(false);
  });

  it("REQ-3443: el pasado y lo que no alcanza el aviso mínimo no se ofrecen", () => {
    const dias = monthAvailability({ rules: reglas, blackouts: [] }, "2026-11", { today: "2026-11-10", minDays: 2 });
    expect(dias.find((d) => d.date === "2026-11-05")?.bookable).toBe(false); // pasado
    expect(dias.find((d) => d.date === "2026-11-11")?.bookable).toBe(false); // no alcanza el aviso
    expect(dias.find((d) => d.date === "2026-11-12")?.bookable).toBe(true);
  });

  it("REQ-3444: las tarifas por rango de un proveedor (Tangol) se vuelven reglas", () => {
    const r = fromDateRanges([
      { option: "REG", validFrom: "2026-12-01", validTo: "2026-12-31", rackAdult: 90, currency: USD },
      { option: "REG", validFrom: null, validTo: null, rackAdult: 95, currency: null },
    ], { fallbackCurrency: USD });
    expect(r[0]).toEqual({ option: "REG", from: "2026-12-01", to: "2026-12-31", adult: 90, currency: USD });
    // Sin rango, la tarifa vale siempre; sin moneda, la del tour.
    expect(r[1]).toEqual({ option: "REG", from: null, to: null, adult: 95, currency: USD });
  });

  it("REQ-3444: las fechas de salida sueltas de un proveedor (Freetour) se vuelven reglas de un día", () => {
    const r = fromFixedDates(["2026-11-03", "2026-11-07"], { adult: 0, currency: "EUR" });
    expect(r).toEqual([
      { option: null, from: "2026-11-03", to: "2026-11-03", adult: 0, currency: "EUR" },
      { option: null, from: "2026-11-07", to: "2026-11-07", adult: 0, currency: "EUR" },
    ]);
  });

  it("REQ-3444: los dos proveedores conviven en el mismo calendario", () => {
    const dias = monthAvailability({ rules: [...fromFixedDates(["2026-11-03"], { adult: 0, currency: "EUR" })], blackouts: [] }, "2026-11", { today: "2026-10-01" });
    expect(dias.find((d) => d.date === "2026-11-03")).toEqual({ date: "2026-11-03", bookable: true, from: 0, currency: "EUR" });
    expect(dias.find((d) => d.date === "2026-11-04")?.bookable).toBe(false);
  });

  it("REQ-3445: el mes se pide con AAAA-MM y un mes inválido no truena", () => {
    expect(monthAvailability({ rules: reglas, blackouts: [] }, "2026-13", { today: "2026-10-01" })).toEqual([]);
    expect(monthAvailability({ rules: reglas, blackouts: [] }, "nada", { today: "2026-10-01" })).toEqual([]);
  });

  it("REQ-3445: nunca se expone el neto ni el proveedor: la regla solo lleva precio público", () => {
    const r = fromDateRanges([{ option: "REG", validFrom: null, validTo: null, rackAdult: 90, currency: USD, net: 70, provider: "tangol" } as never], { fallbackCurrency: USD });
    expect(Object.keys(r[0]).sort()).toEqual(["adult", "currency", "from", "option", "to"]);
  });
});
