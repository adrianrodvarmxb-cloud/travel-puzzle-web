import { describe, it, expect } from "vitest";
import { ownTripDepartures } from "./own-trips";

describe("REQ-049 adaptador de viajes propios (Inca, China y los que vengan)", () => {
  const trip = { languages: ["es", "en"], availability: { weekdays: [1, 3], closedDates: ["2026-11-11"] }, minNoticeHours: 48 };
  it("REQ-049: salidas en los días de la semana disponibles, sin fechas cerradas ni antes de la anticipación mínima", () => {
    const d = ownTripDepartures(trip, "2026-11-05", 14); // jue 5 nov; lun=1, mié=3
    const dates = [...new Set(d.map((x) => x.date))];
    expect(dates).toEqual(["2026-11-09", "2026-11-16", "2026-11-18"]); // 11 cerrado; 5–6 dentro de las 48 h
    expect(new Set(d.map((x) => x.language))).toEqual(new Set(["es", "en"]));
  });
  it("REQ-049: sin días configurados = todos los días", () => {
    const d = ownTripDepartures({ languages: ["es"], availability: { weekdays: [], closedDates: [] }, minNoticeHours: 0 }, "2026-11-05", 3);
    expect(d.map((x) => x.date)).toEqual(["2026-11-05", "2026-11-06", "2026-11-07"]);
  });
});
