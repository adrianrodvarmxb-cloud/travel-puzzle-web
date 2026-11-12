import { describe, it, expect } from "vitest";
import { summarizeRates, isDateBookable, publicPrice, rangeRatesFromTangol } from "./rates";
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
      { code: "AM", description: "Mañana", startTime: "09:00", fromAdult: 45, hoursBooking: 24, hoursCancelation: 48 },
      { code: "PM", description: "Tarde", startTime: "15:00", fromAdult: 60, hoursBooking: 12, hoursCancelation: 24 },
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
