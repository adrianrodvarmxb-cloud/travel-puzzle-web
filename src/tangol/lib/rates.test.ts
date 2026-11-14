import { describe, it, expect } from "vitest";
import { summarizeRates, isDateBookable, publicPrice, rangeRatesFromTangol, availabilityRules } from "./rates";
import { parseOperationDays } from "./operation-days";
import { parseTourRates } from "./schemas";

const raw = {
  TourId: 10,
  Currency: "USD",
  MinRate: 40,
  ListTourOption: [
    { Code: "AM", Description: "Mañana", MinRate: 40, StartTime: "09:00", HoursBooking: 24, HoursCancelation: 48 },
    { Code: "PM", Description: "Tarde", MinRate: 55, StartTime: "15:00", HoursBooking: 12, HoursCancelation: 24 },
  ],
  ListTourRate: [
    { TourOption: "AM", Currency: "USD", PaxFrom: 1, PaxTo: 10, RackRateAdu: 50, RackRateChd: 30, RackRateInf: 0, Utilidad: 10, ValidFrom: "2026-11-01T00:00:00", ValidTo: "2027-03-31T00:00:00" },
    { TourOption: "AM", Currency: "USD", PaxFrom: 11, PaxTo: 20, RackRateAdu: 45, RackRateChd: 28, RackRateInf: 0, Utilidad: 9, ValidFrom: "2026-11-01T00:00:00", ValidTo: "2027-03-31T00:00:00" },
    { TourOption: "PM", Currency: "USD", PaxFrom: 1, PaxTo: 10, RackRateAdu: 60, RackRateChd: 35, RackRateInf: 0, Utilidad: 12, ValidFrom: "2026-11-01T00:00:00", ValidTo: "2027-03-31T00:00:00" },
  ],
  ListBlackDate: [{ DateFrom: "2026-12-24T00:00:00", DateTo: "2026-12-25T00:00:00", TourId: 10 }],
};

describe("tarifas de Tangol", () => {
  it("REQ-1542: resume opciones con su precio de adulto más bajo, horas para reservar/cancelar y bloqueos", () => {
    const s = summarizeRates(parseTourRates(raw));
    expect(s.tourId).toBe(10);
    expect(s.currency).toBe("USD");
    expect(s.options).toEqual([
      { code: "AM", description: "Mañana", startTime: "09:00", fromAdult: 45, hoursBooking: 24, hoursCancelation: 48, operationDays: null, operationDaysRaw: null },
      { code: "PM", description: "Tarde", startTime: "15:00", fromAdult: 60, hoursBooking: 12, hoursCancelation: 24, operationDays: null, operationDaysRaw: null },
    ]);
    expect(s.fromAdult).toBe(45);
    expect(s.blackouts).toEqual([{ from: "2026-12-24", to: "2026-12-25" }]);
  });

  it("REQ-1542: una fecha bloqueada o fuera de vigencia no se ofrece", () => {
    const s = summarizeRates(parseTourRates(raw));
    expect(isDateBookable(s, "2026-12-01")).toBe(true);
    expect(isDateBookable(s, "2026-12-24")).toBe(false);
    expect(isDateBookable(s, "2026-12-25")).toBe(false);
    expect(isDateBookable(s, "2026-10-15")).toBe(false);
    expect(isDateBookable(s, "2027-04-01")).toBe(false);
  });

  it("REQ-1543: el precio al cliente es la tarifa pública; neto, comisión y utilidad nunca salen", () => {
    const s = summarizeRates(parseTourRates(raw));
    expect(publicPrice(s.rates[0])).toEqual({ adult: 50, child: 30, infant: 0, currency: "USD" });
    const json = JSON.stringify(s);
    expect(json).not.toMatch(/Utilidad|utilidad|Nett|nett|Commission|commission/);
  });

  it("REQ-1542: una tarifa con datos rotos se descarta sin tumbar el resto", () => {
    const roto = { ...raw, ListTourRate: [...raw.ListTourRate, { TourOption: "AM", RackRateAdu: "no-es-numero" }] };
    const s = summarizeRates(parseTourRates(roto));
    expect(s.rates).toHaveLength(3);
    expect(s.discarded).toBe(1);
  });

  // ───────── REQ-10513: días de operación y anticipación ─────────
  it("REQ-10513: OperationDays se entiende en los formatos previsibles; lo que no se entiende queda en null", () => {
    expect(parseOperationDays("Lunes, Miércoles y Viernes")).toEqual([1, 3, 5]);
    expect(parseOperationDays("Mon,Tue,Wed,Thu,Fri,Sat,Sun")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseOperationDays("1,2,3,4,5")).toEqual([1, 2, 3, 4, 5]);
    expect(parseOperationDays("7")).toEqual([0]);
    expect(parseOperationDays("LMXJVSD")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseOperationDays("NNNNNSS")).toEqual([0, 6]);
    expect(parseOperationDays("1111100")).toEqual([1, 2, 3, 4, 5]);
    expect(parseOperationDays("Todos los días")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseOperationDays("Daily")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseOperationDays("")).toBeNull();
    expect(parseOperationDays(null)).toBeNull();
    expect(parseOperationDays("según temporada")).toBeNull();
  });

  const conDias = {
    ...raw,
    ListTourOption: [
      { ...raw.ListTourOption[0], OperationDays: "Lunes, Miércoles, Viernes" },
      { ...raw.ListTourOption[1], OperationDays: "Sábado" },
    ],
  };

  it("REQ-10513: el resumen conserva los días de operación de cada opción (0=domingo…6=sábado) y el texto original", () => {
    const s = summarizeRates(parseTourRates(conDias));
    expect(s.options[0]).toMatchObject({ code: "AM", operationDays: [1, 3, 5], operationDaysRaw: "Lunes, Miércoles, Viernes" });
    expect(s.options[1]).toMatchObject({ code: "PM", operationDays: [6], operationDaysRaw: "Sábado" });
  });

  it("REQ-10513: con 2 argumentos isDateBookable sigue igual (solo vigencia y bloqueos)", () => {
    const s = summarizeRates(parseTourRates(conDias));
    expect(isDateBookable(s, "2026-12-01")).toBe(true); // martes: sin días de operación en la regla vieja
  });

  it("REQ-10513: con { now } la fecha debe caer en un día de operación de una opción con tarifa vigente", () => {
    const s = summarizeRates(parseTourRates(conDias));
    const now = new Date("2026-11-20T12:00:00Z");
    expect(isDateBookable(s, "2026-12-01", { now })).toBe(false); // martes: ni AM (L,X,V) ni PM (S)
    expect(isDateBookable(s, "2026-12-02", { now })).toBe(true); // miércoles: AM
    expect(isDateBookable(s, "2026-12-05", { now })).toBe(true); // sábado: PM
    expect(isDateBookable(s, "2026-12-24", { now })).toBe(false); // jueves y además bloqueado
    expect(isDateBookable(s, "2027-04-02", { now })).toBe(false); // viernes fuera de vigencia
  });

  it("REQ-10513: con { now } se respeta la anticipación HoursBooking de la opción", () => {
    const s = summarizeRates(parseTourRates(conDias));
    // AM sale 09:00 con 24 h de anticipación: el miércoles 2 de diciembre ya no se puede el 1 a las 12:00.
    expect(isDateBookable(s, "2026-12-02", { now: new Date("2026-12-01T12:00:00Z") })).toBe(false);
    expect(isDateBookable(s, "2026-12-02", { now: new Date("2026-12-01T08:00:00Z") })).toBe(true);
    // PM sale 15:00 con 12 h: el sábado 5 sí se puede el 5 a las 02:00, no a las 04:00.
    expect(isDateBookable(s, "2026-12-05", { now: new Date("2026-12-05T02:00:00Z") })).toBe(true);
    expect(isDateBookable(s, "2026-12-05", { now: new Date("2026-12-05T04:00:00Z") })).toBe(false);
  });

  it("REQ-10513: una opción sin días entendidos no restringe; sin opciones manda la regla vieja", () => {
    const sinDias = summarizeRates(parseTourRates(raw));
    const now = new Date("2026-11-20T12:00:00Z");
    expect(isDateBookable(sinDias, "2026-12-01", { now })).toBe(true);
    expect(isDateBookable({ rates: sinDias.rates, blackouts: sinDias.blackouts }, "2026-12-01", { now })).toBe(true);
  });

  it("REQ-10513: availabilityRules guarda lo necesario para calcular disponibilidad después, sin dinero", () => {
    const a = availabilityRules(summarizeRates(parseTourRates(conDias)));
    expect(a).toEqual({
      options: [
        { code: "AM", startTime: "09:00", operationDays: [1, 3, 5], operationDaysRaw: "Lunes, Miércoles, Viernes", hoursBooking: 24, hoursCancelation: 48 },
        { code: "PM", startTime: "15:00", operationDays: [6], operationDaysRaw: "Sábado", hoursBooking: 12, hoursCancelation: 24 },
      ],
      validity: [
        { option: "AM", from: "2026-11-01", to: "2027-03-31" },
        { option: "PM", from: "2026-11-01", to: "2027-03-31" },
      ],
      blackouts: [{ from: "2026-12-24", to: "2026-12-25" }],
    });
    expect(JSON.stringify(a)).not.toMatch(/Rack|rack|Utilidad|Net|price|Price/);
  });
});

// REQ-3468 — las tarifas de Tangol, en la forma común que pinta el calendario de la ficha.
describe("REQ-3468: tarifas de Tangol → disponibilidad común", () => {
  it("REQ-3468: pasa tarifas públicas, bloqueos y el aviso mínimo menos exigente; nada de netos", () => {
    const r = rangeRatesFromTangol(parseTourRates(raw));
    expect(r.currency).toBe("USD");
    expect(r.blackouts).toEqual([{ from: "2026-12-24", to: "2026-12-25" }]);
    expect(r.hoursBooking).toBe(12);
    expect(r.rates).toHaveLength(3);
    expect(r.rates[0]).toEqual({ option: "AM", validFrom: "2026-11-01", validTo: "2027-03-31", rackAdult: 50, currency: "USD" });
    expect(JSON.stringify(r)).not.toMatch(/tilidad|Nett|nett/);
  });

  it("REQ-3468: sin opciones no hay aviso mínimo que aplicar", () => {
    expect(rangeRatesFromTangol({ ...parseTourRates(raw), options: [] }).hoursBooking).toBeNull();
  });
});
