// REQ-3468, REQ-3470, REQ-3471 — del dato del proveedor al calendario común, sin netos ni nombre del proveedor.
import { describe, expect, it } from "vitest";
import {
  availabilityFromDates,
  availabilityFromRanges,
  availabilityKind,
  buildCalendar,
  datesFromJson,
  isProviderCalendarEnabled,
  minAdvanceDays,
  monthsFrom,
} from "./provider-availability";
import { calendarView } from "./calendar-view";

/** Respuesta de ejemplo con la forma de `parseTourRates` (Tangol). Datos de ejemplo: nunca se llama al proveedor. */
const tarifas = {
  currency: "USD",
  rates: [
    { option: "A", validFrom: "2026-12-01", validTo: "2026-12-15", rackAdult: 120, currency: "USD" },
    { option: "B", validFrom: "2026-12-10", validTo: "2026-12-31", rackAdult: 95, currency: "USD" },
  ],
  blackouts: [{ from: "2026-12-24", to: "2026-12-25" }],
  hoursBooking: 48,
};

describe("REQ-3468: traductores por proveedor", () => {
  it("REQ-3468: Tangol da tarifas con rango; el resto, fechas sueltas", () => {
    expect(availabilityKind("tangol")).toBe("ranges");
    expect(availabilityKind("freetour")).toBe("fixed-dates");
    expect(availabilityKind("proveedor-nuevo")).toBe("fixed-dates");
  });

  it("REQ-3468: de las tarifas con rango sale el precio más bajo del día y respeta el bloqueo", () => {
    const a = availabilityFromRanges(tarifas);
    const cal = buildCalendar(a, { today: "2026-11-12", months: 2, minDays: 0, currency: "USD" });
    const dic = cal!.months.find((m) => m.month === "2026-12")!;
    const dia = (d: string) => dic.days.find((x) => x.date === d)!;
    expect(dia("2026-12-05")).toMatchObject({ bookable: true, from: 120, currency: "USD" });
    expect(dia("2026-12-12")).toMatchObject({ bookable: true, from: 95 });
    expect(dia("2026-12-24")).toMatchObject({ bookable: false, from: null });
    expect(dic.days.find((x) => x.date === "2026-11-30")).toBeUndefined();
  });

  it("REQ-3468: el aviso mínimo en horas se vuelve días completos", () => {
    expect(minAdvanceDays(48)).toBe(2);
    expect(minAdvanceDays(25)).toBe(2);
    expect(minAdvanceDays(0)).toBe(0);
    expect(minAdvanceDays(null)).toBe(0);
    expect(minAdvanceDays(undefined)).toBe(0);
  });

  it("REQ-3468: con el aviso mínimo, hoy y mañana no se ofrecen", () => {
    const a = availabilityFromRanges({ currency: "USD", blackouts: [], rates: [{ option: null, validFrom: null, validTo: null, rackAdult: 50, currency: "USD" }] });
    const cal = buildCalendar(a, { today: "2026-12-10", months: 1, minDays: minAdvanceDays(48), currency: "USD" });
    const dias = cal!.months[0].days;
    expect(dias.find((d) => d.date === "2026-12-10")!.bookable).toBe(false);
    expect(dias.find((d) => d.date === "2026-12-11")!.bookable).toBe(false);
    expect(dias.find((d) => d.date === "2026-12-12")!.bookable).toBe(true);
  });

  it("REQ-3468: de las fechas sueltas (Freetour) sale el mismo calendario", () => {
    const a = availabilityFromDates({ dates: ["2026-11-20", "2026-11-21", "no-es-fecha"], adult: 0, currency: "EUR" });
    const cal = buildCalendar(a, { today: "2026-11-12", months: 1, currency: "EUR" });
    const dias = cal!.months[0].days.filter((d) => d.bookable).map((d) => d.date);
    expect(dias).toEqual(["2026-11-20", "2026-11-21"]);
    expect(cal!.months[0].days.find((d) => d.date === "2026-11-20")!.from).toBe(0);
  });

  it("REQ-3468: las fechas de la base se leen igual como arreglo o como texto JSON", () => {
    expect(datesFromJson('["2026-11-20","2026-11-21T09:00:00"]')).toEqual(["2026-11-20", "2026-11-21"]);
    expect(datesFromJson(["2026-11-20", 7, "ayer"])).toEqual(["2026-11-20"]);
    expect(datesFromJson("no-es-json")).toEqual([]);
    expect(datesFromJson(null)).toEqual([]);
  });

  it("REQ-3468: la ventana de meses arranca en el mes de hoy", () => {
    expect(monthsFrom("2026-11-12", 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(monthsFrom("2026-12-31", 2)).toEqual(["2026-12", "2027-01"]);
  });
});

describe("REQ-3470: sin fechas que ofrecer no se pinta un calendario vacío", () => {
  it("REQ-3470: tarifas vencidas devuelven null (la ficha queda con su precio «desde»)", () => {
    const a = availabilityFromRanges({ currency: "USD", rates: [{ option: "A", validFrom: "2020-01-01", validTo: "2020-12-31", rackAdult: 10, currency: "USD" }], blackouts: [] });
    expect(buildCalendar(a, { today: "2026-11-12", months: 6, currency: "USD" })).toBeNull();
  });

  it("REQ-3470: un tour sin fechas de salida devuelve null", () => {
    expect(buildCalendar(availabilityFromDates({ dates: [], adult: 0, currency: "EUR" }), { today: "2026-11-12", months: 6, currency: "EUR" })).toBeNull();
  });
});

describe("REQ-3471: el candado del calendario", () => {
  it("REQ-3471: el calendario vive tras PROVIDER_CALENDAR_ENABLED (apagado por omisión)", () => {
    expect(isProviderCalendarEnabled(undefined)).toBe(false);
    expect(isProviderCalendarEnabled("false")).toBe(false);
    expect(isProviderCalendarEnabled("1")).toBe(false);
    expect(isProviderCalendarEnabled("true")).toBe(true);
  });

  it("REQ-3471: ni el neto, ni la comisión, ni «Utilidad», ni el nombre del proveedor llegan a la vista", () => {
    const sucias = {
      currency: "USD",
      blackouts: [],
      hoursBooking: 24,
      rates: [
        {
          option: "A",
          validFrom: null,
          validTo: null,
          rackAdult: 120,
          currency: "USD",
          net: 96,
          comision: 24,
          Utilidad: 24,
          provider: "Tangol",
          providerName: "Tangol S.A.",
        } as never,
      ],
    };
    const cal = buildCalendar(availabilityFromRanges(sucias), { today: "2026-11-12", months: 2, currency: "USD" })!;
    const vista = calendarView(cal, "es");
    const json = JSON.stringify(vista).toLowerCase();
    for (const prohibido of ["tangol", "utilidad", "comision", "comisión", "neto", "rackadult", "proveedor", '"net"']) {
      expect(json).not.toContain(prohibido);
    }
    expect(json).toContain("120");
  });
});
