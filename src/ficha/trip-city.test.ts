// REQ-10872: ciudad del catálogo de un viaje con la base inyectada. npx vitest run src/ficha/trip-city.test.ts
import { describe, expect, it } from "vitest";
import { loadTripCityId, type TripCityDeps } from "./trip-city";

const calls: string[][] = [];
const deps: TripCityDeps = {
  citiesInCountries: async (iso2s) => {
    calls.push(iso2s);
    return [
      { id: 1, iso2: "AR", translations: { es: "Buenos Aires" } },
      { id: 2, iso2: "AR", translations: { es: "Bariloche", en: "San Carlos de Bariloche" } },
    ];
  },
};

describe("REQ-10872: loadTripCityId", () => {
  it("REQ-10872: pide a la base solo las ciudades de los países del viaje (ISO-2 en mayúsculas, sin repetir) y devuelve la de inicio", async () => {
    calls.length = 0;
    expect(await loadTripCityId(deps, { countries: ["ar", "AR", "cl"], cities: ["Bariloche", "Buenos Aires"] })).toBe(2);
    expect(calls).toEqual([["AR", "CL"]]);
  });

  it("REQ-10872: sin países o sin ciudades no consulta la base y devuelve null", async () => {
    calls.length = 0;
    expect(await loadTripCityId(deps, { countries: [], cities: ["Buenos Aires"] })).toBeNull();
    expect(await loadTripCityId(deps, { countries: ["AR"], cities: [] })).toBeNull();
    expect(calls).toEqual([]);
  });

  it("REQ-10872: sin coincidencia, null (nunca la primera ciudad del país)", async () => {
    expect(await loadTripCityId(deps, { countries: ["AR"], cities: ["Ushuaia"] })).toBeNull();
  });
});
