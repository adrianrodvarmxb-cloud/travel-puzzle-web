import { describe, it, expect } from "vitest";
import { parseExtraFilters, extraFiltersToParams, countActive, EMPTY_EXTRA } from "./extra-filters";
import { matchesToursFilter } from "@/trips/lib/public";

const today = "2026-11-12";
describe("REQ-1421 / REQ-1422: ?tema= y ?atrib= en la URL de /tours", () => {
  it("REQ-1421: se leen y se escriben con la taxonomía encendida", () => {
    const f = parseExtraFilters(new URLSearchParams("tema=naturaleza,gastronomia&atrib=nocturno,a-pie"), today, { taxonomy: true });
    expect(f.temas).toEqual(["gastronomia", "naturaleza"]);
    expect(f.atributos).toEqual(["a-pie", "nocturno"]);
    expect(extraFiltersToParams(f).toString()).toBe("tema=gastronomia%2Cnaturaleza&atrib=a-pie%2Cnocturno");
    expect(countActive(f)).toBe(4);
  });
  it("REQ-1421: con la taxonomía apagada no filtran", () => {
    const f = parseExtraFilters(new URLSearchParams("tema=naturaleza&atrib=nocturno"), today, {});
    expect(f.temas).toEqual([]);
    expect(f.atributos).toEqual([]);
  });
  it("REQ-1422: un viaje propio sin temas ni atributos no sale al filtrar por ellos (no se afirma lo que no hay)", () => {
    const trip = { kind: "circuito", countries: ["PE"], title: "Perú", formato: "circuito" } as Parameters<typeof matchesToursFilter>[0];
    expect(matchesToursFilter(trip, { countryCode: null, kind: "all", ...EMPTY_EXTRA })).toBe(true);
    expect(matchesToursFilter(trip, { countryCode: null, kind: "all", ...EMPTY_EXTRA, temas: ["naturaleza"] })).toBe(false);
    expect(matchesToursFilter(trip, { countryCode: null, kind: "all", ...EMPTY_EXTRA, atributos: ["nocturno"] })).toBe(false);
  });
});
