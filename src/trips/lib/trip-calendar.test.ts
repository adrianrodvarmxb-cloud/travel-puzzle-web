// REQ-10863 — calendario con precio por día en la ficha de un viaje de proveedor de PDF (plan REQ-3454, G1–G5 = A).
// Puro: el día de hoy entra por parámetro. Sin neto ni nombre del proveedor en lo que sale.
import { describe, expect, it } from "vitest";
import { isTripCalendarEnabled, tripCalendar, type TripCalendarInput } from "./trip-calendar";
import { calendarView } from "../../tours/lib/calendar-view";

/** Viaje de ejemplo con la forma de Fantástica China: sale lunes, martes y jueves; temporada alta en octubre;
 *  Feria de Cantón se suma; vigencia hasta fin de 2027; una semana «por confirmar». Precios públicos de ejemplo. */
const viaje: TripCalendarInput = {
  currency: "USD",
  minNoticeHours: 48,
  options: [
    { id: "doble", adult: 1000 },
    { id: "individual", adult: 1400 },
  ],
  availability: {
    weekdays: [1, 2, 4],
    closedDates: ["2026-12-25"],
    seasons: [{ name: "Alta", from: "2026-10-01", to: "2026-10-31", supplement: 200 }],
    validFrom: "2026-01-01",
    validTo: "2027-12-31",
    weekdayRules: [],
    surcharges: [{ name: "Feria de Cantón", from: "2026-10-15", to: "2026-10-19", weekdays: [], amount: 150, byOption: { individual: 300 } }],
    quoteRanges: [{ from: "2026-12-28", to: "2027-01-03" }],
  },
};

describe("REQ-10863: el calendario de un viaje de PDF, mes por mes", () => {
  it("REQ-10863: cada día que sale lleva el precio final más bajo; los que no salen, deshabilitados", () => {
    const cal = tripCalendar(viaje, { today: "2026-09-01", months: 2 });
    expect(cal).not.toBeNull();
    const oct = cal!.months.find((m) => m.month === "2026-10")!;
    const dia = (d: string) => oct.days.find((x) => x.date === d)!;
    // 2026-10-05 es lunes: base 1000 + temporada 200 (doble, la más baja)
    expect(dia("2026-10-05")).toMatchObject({ bookable: true, from: 1200, currency: "USD" });
    // 2026-10-15 es jueves y cae en Feria de Cantón: 1000 + 200 + 150 (G2: se suman)
    expect(dia("2026-10-15")).toMatchObject({ bookable: true, from: 1350 });
    // 2026-10-07 es miércoles: no sale
    expect(dia("2026-10-07")).toMatchObject({ bookable: false, from: null });
    expect(cal!.currency).toBe("USD");
  });

  it("REQ-10863: un día dentro de «por confirmar» se ofrece sin precio (G3) y un cierre no se ofrece", () => {
    const cal = tripCalendar(viaje, { today: "2026-12-01", months: 2 })!;
    const dic = cal.months.find((m) => m.month === "2026-12")!;
    const d = (x: string) => dic.days.find((y) => y.date === x)!;
    // 2026-12-28 es lunes y está en quoteRanges
    expect(d("2026-12-28")).toMatchObject({ bookable: true, from: null, quote: true });
    // 2026-12-25 es viernes (no sale) y además está cerrado
    expect(d("2026-12-25")).toMatchObject({ bookable: false });
    // 2026-12-21, lunes, antes de la semana por confirmar: precio normal (sin temporada en diciembre)
    expect(d("2026-12-21")).toMatchObject({ bookable: true, from: 1000 });
  });

  it("REQ-10863: el aviso mínimo del viaje (horas) descarta los primeros días y el calendario abre en el primer mes con salida", () => {
    // Hoy lunes 2026-10-05: con 48 h de aviso, el martes 6 ya no se ofrece; el jueves 8 sí.
    const cal = tripCalendar(viaje, { today: "2026-10-05", months: 1 })!;
    const oct = cal.months[0];
    expect(oct.days.find((x) => x.date === "2026-10-05")!.bookable).toBe(false);
    expect(oct.days.find((x) => x.date === "2026-10-06")!.bookable).toBe(false);
    expect(oct.days.find((x) => x.date === "2026-10-08")!.bookable).toBe(true);
    expect(cal.start).toBe(0);
  });

  it("REQ-10863: fuera de vigencia (G4) o sin un solo día que salga, no hay calendario (null): la ficha queda como hoy", () => {
    expect(tripCalendar(viaje, { today: "2028-01-10", months: 6 })).toBeNull();
    expect(tripCalendar({ ...viaje, options: [] }, { today: "2026-09-01", months: 6 })).toBeNull();
  });

  it("REQ-10863: la ventana arranca en el mes de hoy y el calendario abre en el primer mes con fechas", () => {
    const sinDiciembre: TripCalendarInput = { ...viaje, availability: { ...viaje.availability, validFrom: "2027-01-04" } };
    const cal = tripCalendar(sinDiciembre, { today: "2026-12-01", months: 3 })!;
    expect(cal.months.map((m) => m.month)).toEqual(["2026-12", "2027-01", "2027-02"]);
    expect(cal.start).toBe(1);
  });

  it("REQ-10863: lo que viaja al cliente son solo día, si se ofrece, precio público, moneda y «por confirmar»", () => {
    const vista = calendarView(tripCalendar(viaje, { today: "2026-09-01", months: 2 })!, "es");
    const texto = JSON.stringify(vista).toLowerCase();
    for (const prohibido of ["neto", "net", "utilidad", "margen", "comision", "proveedor", "fantástica", "fantastica"]) {
      expect(texto, prohibido).not.toContain(prohibido);
    }
    const celdas = vista.months.flatMap((m) => m.cells).filter((c): c is NonNullable<typeof c> => c !== null);
    const permitidas = new Set(["bookable", "date", "day", "price", "quote"]);
    for (const c of celdas) for (const k of Object.keys(c)) expect(permitidas.has(k), k).toBe(true);
  });
});

describe("REQ-10863: el calendario del viaje vive tras TRIP_CALENDAR_ENABLED", () => {
  it("REQ-10863: apagado por omisión; solo \"true\" lo enciende", () => {
    expect(isTripCalendarEnabled(undefined)).toBe(false);
    expect(isTripCalendarEnabled("false")).toBe(false);
    expect(isTripCalendarEnabled("preview")).toBe(false);
    expect(isTripCalendarEnabled("true")).toBe(true);
  });
});

describe("REQ-10863: cableado en la ficha del viaje y bandera en wrangler.jsonc", () => {
  it("REQ-10863: la ficha lee TRIP_CALENDAR_ENABLED y pinta el mismo componente que la ficha de tours, en su SectionBoundary", () => {
    const src = require("node:fs").readFileSync(new URL("../../components/trips/TripDetailView.tsx", import.meta.url), "utf-8");
    expect(src).toContain("isTripCalendarEnabled(env.TRIP_CALENDAR_ENABLED)");
    expect(src).toContain("<ProviderDateCalendar view={calendario} />");
    expect(src).toContain('<SectionBoundary name="calendario-viaje">');
  });

  it("REQ-10863: la bandera está encendida en wrangler.jsonc (23-11-2026, con humo en preview); regreso: \"false\"", () => {
    const wrangler = require("node:fs").readFileSync(new URL("../../../wrangler.jsonc", import.meta.url), "utf-8");
    expect(wrangler).toMatch(/"TRIP_CALENDAR_ENABLED": "true"/);
    expect(isTripCalendarEnabled("false")).toBe(false);
  });
});
