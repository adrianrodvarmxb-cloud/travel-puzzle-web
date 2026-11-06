import { describe, it, expect } from "vitest";
import { parseCityAliases, resolveCityAlias, suggestAliases } from "./alias";

const CSV = `provider,provider_city_id,city_key,canonical_city_id,nota
freetour,4200,taipei,4200,Taipei
freetour,6172,taipei,4200,Taipéi / Taipei City
`;

describe("alias de ciudad", () => {
  const aliases = parseCityAliases(CSV);

  it("REQ-135: 4200 y 6172 apuntan a la ciudad canónica «taipei» (4200)", () => {
    expect(resolveCityAlias("freetour", 4200, aliases)).toEqual({ cityKey: "taipei", canonicalCityId: 4200 });
    expect(resolveCityAlias("freetour", 6172, aliases)).toEqual({ cityKey: "taipei", canonicalCityId: 4200 });
  });

  it("REQ-135: un id sin alias no se une a nada", () => {
    expect(resolveCityAlias("freetour", 1, aliases)).toBeNull();
    expect(resolveCityAlias("otro", 4200, aliases)).toBeNull();
  });

  it("REQ-135: city_key debe ser un slug válido; una fila rota se descarta", () => {
    expect(parseCityAliases("provider,provider_city_id,city_key,canonical_city_id\nfreetour,x,Taipéi,4200\n")).toEqual([]);
  });

  it("REQ-135: sugiere (no aplica) duplicados por nombre normalizado + país + pocos km", () => {
    const s = suggestAliases([
      { id: 4200, iso2: "TW", names: ["Taipei"], centroid: { lat: 25.04, lng: 121.51 } },
      { id: 6172, iso2: "TW", names: ["Taipéi", "Taipei City"], centroid: { lat: 25.05, lng: 121.52 } },
      { id: 1, iso2: "MX", names: ["Taipei"], centroid: { lat: 25.04, lng: 121.51 } },
    ]);
    expect(s).toEqual([{ ids: [4200, 6172], iso2: "TW", key: "taipei" }]);
  });
});
