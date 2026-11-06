import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { GEO_ATTRIBUTION, GEO_ATTRIBUTION_PATHS, geoAttribution, geoAttributionFor, isGeoAttributionEnabled } from "./attribution";

describe("atribución de datos geográficos", () => {
  it("REQ-138: texto CC BY 4.0 de GeoNames con enlace a la licencia", () => {
    expect(GEO_ATTRIBUTION.geonames.text).toBe("Datos geográficos: GeoNames (geonames.org), licencia CC BY 4.0.");
    expect(GEO_ATTRIBUTION.geonames.links).toEqual(["https://www.geonames.org/", "https://creativecommons.org/licenses/by/4.0/deed.es"]);
  });

  it("REQ-138: con la bandera apagada no se muestra nada", () => {
    expect(geoAttribution({ enabled: false, sourcesInProduction: ["geonames"] })).toEqual([]);
  });

  it("REQ-138: solo nombra las fuentes que se usan en producción", () => {
    expect(geoAttribution({ enabled: true, sourcesInProduction: ["geonames"] }).map((a) => a.id)).toEqual(["geonames"]);
    expect(geoAttribution({ enabled: true, sourcesInProduction: [] })).toEqual([]);
    expect(geoAttribution({ enabled: true, sourcesInProduction: ["wikidata", "geonames"] }).map((a) => a.id)).toEqual(["geonames", "wikidata"]);
  });
});

describe("dónde va la atribución (gate G5, firmado el 5 nov 2026)", () => {
  it("REQ-139: solo en la página legal de términos, nunca en el pie ni en otras rutas", () => {
    expect(GEO_ATTRIBUTION_PATHS).toEqual(["/terminos"]);
    const on = { GEO_ATTRIBUTION_ENABLED: "true" };
    expect(geoAttributionFor("/terminos", on).map((a) => a.id)).toEqual(["geonames"]);
    for (const path of ["/", "/privacidad", "/cookies", "/destinos", "footer"]) expect(geoAttributionFor(path, on)).toEqual([]);
  });

  it("REQ-139: la bandera solo enciende con \"true\" exacto; sin variable o con \"false\" no se muestra", () => {
    expect(isGeoAttributionEnabled("true")).toBe(true);
    for (const v of [undefined, "", "false", "TRUE", "1"]) expect(isGeoAttributionEnabled(v)).toBe(false);
    expect(geoAttributionFor("/terminos", {})).toEqual([]);
    expect(geoAttributionFor("/terminos", { GEO_ATTRIBUTION_ENABLED: "false" })).toEqual([]);
  });

  it("REQ-139: wrangler.jsonc trae GEO_ATTRIBUTION_ENABLED=\"false\" y el pie de página no usa la atribución", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"GEO_ATTRIBUTION_ENABLED":\s*"false"/);
    expect(readFileSync("src/components/home/v2/SiteFooter.tsx", "utf8")).not.toMatch(/attribution|GeoAttribution/i);
  });
});
