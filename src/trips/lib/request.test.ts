import { describe, it, expect } from "vitest";
import { availableTimes, isDateOpen, estimate, estimateFor, requestRef, REQUEST_STATUSES } from "./request";

const av = { weekdays: [1, 3, 5], slots: [{ time: "09:00", capacity: 10 }, { time: "16:00", capacity: null }], closedDates: ["2027-03-03"], seasons: [{ name: "Verano", from: "2027-07-01", to: "2027-08-31", supplement: 100 }] };
const now = new Date("2027-03-01T12:00:00Z"); // lunes

describe("calendario", () => {
  it("abre solo los días de la semana marcados, no las fechas cerradas y respeta el aviso mínimo", () => {
    expect(isDateOpen("2027-03-05", av, 24, now)).toBe(true); // viernes
    expect(isDateOpen("2027-03-04", av, 24, now)).toBe(false); // jueves
    expect(isDateOpen("2027-03-03", av, 24, now)).toBe(false); // miércoles cerrado
    expect(isDateOpen("2027-03-01", av, 24, now)).toBe(false); // hoy, aviso de 24 h
    expect(isDateOpen("2027-02-26", av, 0, now)).toBe(false); // pasado
  });
  it("sin días marcados, cualquier fecha futura sirve (viaje a consultar)", () => {
    expect(isDateOpen("2027-03-04", { ...av, weekdays: [] }, 24, now)).toBe(true);
  });
  it("horarios del día", () => {
    expect(availableTimes("2027-03-05", av, 24, now)).toEqual(["09:00", "16:00"]);
    expect(availableTimes("2027-03-04", av, 24, now)).toEqual([]);
  });
});

describe("estimate", () => {
  const opt = { adult: 1000, child: 600, infant: 0 };
  it("adultos + niños + infantes, con suplemento de temporada por adulto", () => {
    expect(estimate(opt, { adults: 2, children: 1, infants: 1 }, "2027-03-05", av.seasons)).toBe(2600);
    expect(estimate(opt, { adults: 2, children: 0, infants: 0 }, "2027-07-10", av.seasons)).toBe(2200);
  });
  it("si falta un precio, no se estima", () => {
    expect(estimate({ adult: 1000, child: null, infant: null }, { adults: 1, children: 1, infants: 0 }, "2027-03-05", [])).toBeNull();
    expect(estimate(null, { adults: 1, children: 0, infants: 0 }, "2027-03-05", [])).toBeNull();
  });
});

describe("calendario de proveedores de PDF (REQ-3454)", () => {
  const pdf = { ...av, weekdays: [], validFrom: "2027-03-01", validTo: "2027-12-31", weekdayRules: [{ from: "2027-11-01", to: "2027-12-31", weekdays: [1] }],
    surcharges: [{ name: "Feria", from: "2027-04-06", to: "2027-04-26", weekdays: [], amount: 70, byOption: { sgl: 140 } }], quoteRanges: [{ from: "2027-12-20", to: "2027-12-31" }] };
  it("REQ-3454: fuera de vigencia o fuera de los días del periodo, la fecha no se puede pedir", () => {
    expect(isDateOpen("2028-01-03", pdf, 24, now)).toBe(false); // fuera de vigencia
    expect(isDateOpen("2027-11-02", pdf, 24, now)).toBe(false); // martes en periodo de solo lunes
    expect(isDateOpen("2027-11-01", pdf, 24, now)).toBe(true);
  });
  it("REQ-3454: el estimado suma temporada y recargo por opción; un día a cotizar no se estima", () => {
    const opt = { id: "sgl", adult: 1000, child: 600, infant: 0 };
    expect(estimateFor(opt, { adults: 2, children: 1, infants: 0 }, "2027-04-12", pdf)).toBe(2 * (1000 + 140) + 600);
    expect(estimateFor(opt, { adults: 1, children: 0, infants: 0 }, "2027-12-20", pdf)).toBeNull();
  });
  it("REQ-3454: sin campos nuevos, estimateFor da lo mismo que estimate", () => {
    const opt = { id: "a", adult: 1000, child: 600, infant: 0 };
    for (const d of ["2027-03-05", "2027-07-10"]) expect(estimateFor(opt, { adults: 2, children: 1, infants: 1 }, d, av)).toBe(estimate(opt, { adults: 2, children: 1, infants: 1 }, d, av.seasons));
  });
});

describe("requestRef y estados", () => {
  it("folio legible", () => {
    expect(requestRef(new Date("2026-11-03T20:00:00Z"), "ab12cd")).toBe("SOL-20261103-AB12");
  });
  it("estados del panel", () => {
    expect(REQUEST_STATUSES).toEqual(["new", "contacted", "quoted", "held", "paid", "closed"]); // REQ-117: "paid" del webhook; REQ-3482: "held" = tarjeta retenida
  });
});
