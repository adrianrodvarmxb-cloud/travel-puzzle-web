// REQ-10944 (ola 12, PR 2, decisión A): filas de TourOption desde el resumen de tarifas; solo tarifa pública y traslado.
// npx vitest run src/tangol/lib/option-rows.test.ts
import { describe, expect, it } from "vitest";
import { tourOptionRows } from "./option-rows";
import { summarizeRates } from "./rates";
import { parseTourRates } from "./schemas";

const crudo = {
  TourId: 2490,
  Currency: "USD",
  ListTourOption: [
    { Code: "CT", Description: "Con traslado desde hotel", StartTime: "08:00", HoursBooking: 24, HoursCancelation: 48 },
    { Code: "ST", Description: "Sin traslado", StartTime: "08:30", HoursBooking: 24, HoursCancelation: 48 },
    { Code: "XX", Description: "Opción sin tarifa", StartTime: null, HoursBooking: null, HoursCancelation: null },
    { Code: "CT", Description: "Repetida", StartTime: "09:00", HoursBooking: 1, HoursCancelation: 1 },
  ],
  ListTourRate: [
    { TourOption: "CT", Currency: "USD", PaxFrom: 1, PaxTo: 2, RackRateAdu: 60, RackRateChd: 30, RackRateInf: 0, NetRate: 41, Utilidad: 19, ValidFrom: "2026-01-01", ValidTo: "2026-12-31" },
    { TourOption: "CT", Currency: "USD", PaxFrom: 3, PaxTo: 9, RackRateAdu: 52, RackRateChd: 26, RackRateInf: 0, NetRate: 35, Utilidad: 17, ValidFrom: "2026-01-01", ValidTo: "2026-12-31" },
    { TourOption: "ST", Currency: "USD", PaxFrom: 1, PaxTo: 9, RackRateAdu: 40, RackRateChd: 20, RackRateInf: 0, NetRate: 28, Utilidad: 12, ValidFrom: "2026-01-01", ValidTo: "2026-12-31" },
    { TourOption: "ST", Currency: "USD", PaxFrom: 10, PaxTo: 20, RackRateAdu: 0, RackRateChd: 0, RackRateInf: 0, ValidFrom: "2026-01-01", ValidTo: "2026-12-31" },
  ],
  ListBlackDate: [],
};

describe("REQ-10944: filas de TourOption desde el resumen de tarifas", () => {
  it("REQ-10944: una fila por opción con su tarifa pública más baja (> 0), su moneda y su traslado; sin tarifa, null; códigos repetidos, la primera", () => {
    const rows = tourOptionRows(summarizeRates(parseTourRates(crudo)), "USD");
    expect(rows).toEqual([
      { code: "CT", description: "Con traslado desde hotel", startTime: "08:00", currency: "USD", rackAdult: 52, transferIncluded: true, hoursBooking: 24, hoursCancelation: 48 },
      { code: "ST", description: "Sin traslado", startTime: "08:30", currency: "USD", rackAdult: 40, transferIncluded: false, hoursBooking: 24, hoursCancelation: 48 },
      { code: "XX", description: "Opción sin tarifa", startTime: null, currency: null, rackAdult: null, transferIncluded: null, hoursBooking: null, hoursCancelation: null },
    ]);
  });

  it("REQ-10944 / REQ-1543: el neto, la utilidad y la comisión no tienen por dónde entrar", () => {
    const rows = tourOptionRows(summarizeRates(parseTourRates(crudo)), "USD");
    const texto = JSON.stringify(rows);
    expect(texto).not.toMatch(/net|utilidad|comision/i);
    // Los netos del crudo (41, 35, 28) y las utilidades (19, 17, 12) no aparecen como montos.
    expect(rows.map((r) => r.rackAdult)).toEqual([52, 40, null]);
    expect(texto).not.toMatch(/:41\b|:35\b|:28\b|:19\b|:17\b|:12\b/);
    expect(Object.keys(rows[0]).sort()).toEqual(["code", "currency", "description", "hoursBooking", "hoursCancelation", "rackAdult", "startTime", "transferIncluded"]);
  });

  it("REQ-10944: la tarifa sin moneda toma la del tour; un código de Tangol (1) se normaliza a USD; sin moneda posible, sin precio", () => {
    const s = summarizeRates(parseTourRates({ ...crudo, ListTourRate: [{ TourOption: "CT", Currency: "", PaxFrom: 1, PaxTo: 9, RackRateAdu: 50 }] }));
    expect(tourOptionRows(s, "ARS")[0]).toMatchObject({ currency: "ARS", rackAdult: 50 });
    expect(tourOptionRows(s, null)[0]).toMatchObject({ currency: null, rackAdult: null });
    const s1 = summarizeRates(parseTourRates({ ...crudo, ListTourRate: [{ TourOption: "CT", Currency: 1, PaxFrom: 1, PaxTo: 9, RackRateAdu: 50 }] }));
    expect(tourOptionRows(s1, null)[0]).toMatchObject({ currency: "USD", rackAdult: 50 });
  });
});
