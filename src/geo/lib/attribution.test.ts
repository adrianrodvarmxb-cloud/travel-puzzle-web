import { describe, it, expect } from "vitest";
import { GEO_ATTRIBUTION, geoAttribution } from "./attribution";

describe("atribución de datos geográficos", () => {
  it("REQ-129: texto CC BY 4.0 de GeoNames con enlace a la licencia", () => {
    expect(GEO_ATTRIBUTION.geonames.text).toBe("Datos geográficos: GeoNames (geonames.org), licencia CC BY 4.0.");
    expect(GEO_ATTRIBUTION.geonames.links).toEqual(["https://www.geonames.org/", "https://creativecommons.org/licenses/by/4.0/deed.es"]);
  });

  it("REQ-129: con la bandera apagada no se muestra nada", () => {
    expect(geoAttribution({ enabled: false, sourcesInProduction: ["geonames"] })).toEqual([]);
  });

  it("REQ-129: solo nombra las fuentes que se usan en producción", () => {
    expect(geoAttribution({ enabled: true, sourcesInProduction: ["geonames"] }).map((a) => a.id)).toEqual(["geonames"]);
    expect(geoAttribution({ enabled: true, sourcesInProduction: [] })).toEqual([]);
    expect(geoAttribution({ enabled: true, sourcesInProduction: ["wikidata", "geonames"] }).map((a) => a.id)).toEqual(["geonames", "wikidata"]);
  });
});
