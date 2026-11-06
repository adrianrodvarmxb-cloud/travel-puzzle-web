import { describe, it, expect } from "vitest";
import { summarize, freshSummary, addDays, HORIZON_DAYS, MAX_AGE_DAYS } from "./summary";

const today = "2026-11-05";
describe("REQ-049 resumen de salidas (común a todos los proveedores)", () => {
  it("REQ-049: idiomas únicos normalizados y fechas dentro del horizonte, ordenadas", () => {
    const s = summarize([
      { date: "2026-11-07", language: "ES" }, { date: "2026-11-06", language: "en" }, { date: "2026-11-06", language: "es" },
      { date: "2026-11-04", language: "fr" }, // pasada
      { date: addDays(today, HORIZON_DAYS + 1), language: "de" }, // fuera del horizonte
    ], today);
    expect(s).toEqual({ languages: ["en", "es"], dates: ["2026-11-06", "2026-11-07"] });
  });
  it("REQ-049: códigos de idioma largos o regionales quedan en 2 letras", () => {
    expect(summarize([{ date: "2026-11-06", language: "pt-BR" }], today).languages).toEqual(["pt"]);
  });
  it("REQ-049: sin salidas, listas vacías", () => {
    expect(summarize([], today)).toEqual({ languages: [], dates: [] });
  });
});

describe("REQ-049 vigencia del dato", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  it("REQ-049: un resumen de hace más de 7 días cuenta como 'sin dato' (no se afirma un idioma que no sabemos)", () => {
    const s = { languages: ["en"], dates: ["2026-11-06"] };
    expect(freshSummary(s, "2026-11-01T00:00:00.000+00:00", now)).toEqual(s);
    expect(freshSummary(s, new Date(now.getTime() - (MAX_AGE_DAYS + 1) * 864e5).toISOString(), now)).toBeNull();
    expect(freshSummary(s, null, now)).toBeNull();
  });
});
