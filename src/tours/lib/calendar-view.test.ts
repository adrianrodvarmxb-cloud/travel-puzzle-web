// REQ-3469 — la vista del calendario se arma en el servidor: etiquetas fijas, sin Intl y sin reloj.
import { describe, expect, it } from "vitest";
import { calendarCopy, calendarView, dayPrice, monthGrid, monthLabel } from "./calendar-view";
import { availabilityFromRanges, buildCalendar } from "./provider-availability";

const cal = buildCalendar(
  availabilityFromRanges({
    currency: "USD",
    blackouts: [{ from: "2026-12-24", to: "2026-12-25" }],
    rates: [{ option: "A", validFrom: "2026-12-01", validTo: "2027-01-31", rackAdult: 99.5, currency: "USD" }],
  }),
  { today: "2026-11-12", months: 3, currency: "USD" },
)!;

describe("REQ-3469: la vista del calendario", () => {
  it("REQ-3469: un mes por página, con su nombre en el idioma de la página", () => {
    const v = calendarView(cal, "es");
    expect(v.months.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(v.months[1].label).toBe("diciembre 2026");
    expect(calendarView(cal, "en").months[1].label).toBe("December 2026");
    expect(monthLabel("2027-01", calendarCopy("es"))).toBe("enero 2027");
  });

  it("REQ-3469: la rejilla empieza en lunes y rellena los huecos del mes", () => {
    const v = calendarView(cal, "es");
    expect(v.weekdays).toEqual(["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]);
    const dic = v.months[1];
    // 1 dic 2026 es martes: un hueco antes del día 1 y 31 días en total.
    expect(dic.cells.slice(0, 2).map((c) => c && c.day)).toEqual([null, 1]);
    expect(dic.cells.filter((c) => c !== null)).toHaveLength(31);
    expect(dic.cells.length % 7).toBe(0);
    // La rejilla es pura: los mismos días dan la misma rejilla.
    expect(monthGrid(cal.months[1].days)).toEqual(dic.cells);
  });

  it("REQ-3469: cada día que se ofrece lleva su precio con moneda; los que no, en gris y sin precio", () => {
    const dic = calendarView(cal, "es").months[1];
    const dia = (n: number) => dic.cells.find((c) => c !== null && c.day === n)!;
    expect(dia(5)).toMatchObject({ bookable: true, price: "USD 99.5" });
    expect(dia(24)).toMatchObject({ bookable: false, price: null });
    expect(calendarView(cal, "es").currency).toBe("USD");
  });

  it("REQ-3469: el precio se arma sin Intl y sin redondeos que engañen", () => {
    expect(dayPrice(99.5, "USD")).toBe("USD 99.5");
    expect(dayPrice(120, "USD")).toBe("USD 120");
    expect(dayPrice(0, "EUR")).toBe(null);
    expect(dayPrice(null, "USD")).toBe(null);
    expect(dayPrice(49.999, "USD")).toBe("USD 50");
  });

  it("REQ-3469: el mes que se abre es el primero con fechas que se ofrecen", () => {
    expect(calendarView(cal, "es").start).toBe(1);
  });

  it("REQ-3469: el componente de cliente no formatea con Intl ni mira el reloj (INC-001)", () => {
    const src = require("node:fs").readFileSync(new URL("../../components/tours/one/ProviderDateCalendar.tsx", import.meta.url), "utf-8");
    expect(src).not.toMatch(/Intl\.|toLocale[A-Za-z]*\(|Date\.now\(|new Date\(/);
  });
});
