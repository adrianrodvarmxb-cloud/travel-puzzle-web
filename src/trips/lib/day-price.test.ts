import { describe, expect, it } from "vitest";
import { dayPrice, departsOn, type DayAvailability } from "./day-price";

// Fantástica China (ejemplo real del tarifario, montos inventados para la prueba).
const china: DayAvailability = {
  weekdays: [1, 2, 4], // lunes, martes y jueves
  closedDates: ["2027-05-04"],
  seasons: [{ name: "Media", from: "2027-04-01", to: "2027-05-31", supplement: 100 }],
  validFrom: "2027-03-23",
  validTo: "2028-03-20",
  weekdayRules: [{ from: "2027-11-09", to: "2028-01-17", weekdays: [1] }], // invierno: solo lunes
  surcharges: [
    { name: "Feria de Cantón", from: "2027-04-06", to: "2027-04-26", weekdays: [], amount: 70, byOption: { sgl: 140 } },
    { name: "Otro día de salida", from: null, to: null, weekdays: [0, 3, 5, 6], amount: 300, byOption: {} },
  ],
  quoteRanges: [{ from: "2027-12-20", to: "2028-01-05" }],
};
const dbl = { id: "dbl", adult: 1000 };
const sgl = { id: "sgl", adult: 1400 };

describe("dayPrice (REQ-3454, REQ-3456)", () => {
  it("REQ-3454: sin campos nuevos se comporta como hoy (solo temporada)", () => {
    const viejo: DayAvailability = { weekdays: [], closedDates: [], seasons: [{ name: "Verano", from: "2027-07-01", to: "2027-08-31", supplement: 100 }] };
    expect(dayPrice("2027-07-10", viejo, dbl)).toEqual({ status: "open", adult: 1100 });
    expect(dayPrice("2027-03-05", viejo, dbl)).toEqual({ status: "open", adult: 1000 });
  });

  it("REQ-3454 (G2): temporada y recargo obligatorio por fecha se suman", () => {
    // 2027-04-12 es lunes, en temporada media y en Feria de Cantón.
    expect(dayPrice("2027-04-12", china, dbl)).toEqual({ status: "open", adult: 1000 + 100 + 70 });
  });

  it("REQ-3454: el recargo puede ser distinto por opción (individual)", () => {
    expect(dayPrice("2027-04-12", china, sgl)).toEqual({ status: "open", adult: 1400 + 100 + 140 });
  });

  it("REQ-3454: salir fuera de los días base suma el recargo por día de la semana", () => {
    // Con weekdays base L-M-J, un sábado no sale salvo que una regla lo permita: se prueba con un viaje de salidas diarias y recargo.
    const diario: DayAvailability = { ...china, weekdays: [], weekdayRules: [] };
    expect(dayPrice("2027-06-05", diario, dbl)).toEqual({ status: "open", adult: 1000 + 300 }); // sábado
    expect(dayPrice("2027-06-07", diario, dbl)).toEqual({ status: "open", adult: 1000 }); // lunes
  });

  it("REQ-3454: los días de salida cambian por periodo (en invierno solo lunes)", () => {
    expect(departsOn("2027-06-08", china)).toBe(true); // martes en verano
    expect(departsOn("2027-11-16", china)).toBe(false); // martes en invierno
    expect(departsOn("2027-11-15", china)).toBe(true); // lunes en invierno
    expect(dayPrice("2027-11-16", china, dbl)).toEqual({ status: "closed", adult: null });
  });

  it("REQ-3454 (G4): fuera de la vigencia del tarifario no se ofrece", () => {
    expect(dayPrice("2027-03-22", china, dbl)).toEqual({ status: "closed", adult: null });
    expect(dayPrice("2028-03-27", china, dbl)).toEqual({ status: "closed", adult: null });
  });

  it("REQ-3454 (G3): un día sin precio publicado sale «por confirmar» y se puede solicitar", () => {
    expect(dayPrice("2027-12-20", china, dbl)).toEqual({ status: "quote", adult: null }); // lunes
  });

  it("REQ-3454: fecha cerrada o inválida no se ofrece", () => {
    expect(dayPrice("2027-05-04", china, dbl)).toEqual({ status: "closed", adult: null });
    expect(dayPrice("2027-02-30", china, dbl)).toEqual({ status: "closed", adult: null });
    expect(dayPrice("hoy", china, dbl)).toEqual({ status: "closed", adult: null });
  });

  it("REQ-3454: sin precio de adulto en la opción no hay precio", () => {
    expect(dayPrice("2027-06-07", china, { id: "dbl", adult: null })).toEqual({ status: "quote", adult: null });
  });
});
