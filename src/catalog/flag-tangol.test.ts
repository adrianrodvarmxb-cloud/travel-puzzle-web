import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { hiddenProviders, providerSql, providerWhere } from "./lib/provider-visibility";
import { parseSmokeConfig } from "../ops/lib/smoke";
import { flaggedSmokePages, wranglerVars } from "../site/lib/pages";

/**
 * Encendido de Tangol (gate C, REQ-1625; filtro REQ-3311/REQ-3312). NO se fusiona hasta que haya tours de
 * Tangol cargados en producción, preview con la bandera encendida y humo verde, y OK del PO.
 */
describe("REQ-3506: TANGOL_ENABLED encendida en producción (gate C)", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");

  it("REQ-3506: wrangler.jsonc enciende TANGOL_ENABLED", () => {
    expect(wrangler).toMatch(/"TANGOL_ENABLED": "true"/);
    expect(wranglerVars(wrangler).TANGOL_ENABLED).toBe("true");
  });

  it("REQ-3506: con el valor de wrangler.jsonc el gate C ya no esconde a Tangol", () => {
    const env = { TANGOL_ENABLED: wranglerVars(wrangler).TANGOL_ENABLED };
    expect(hiddenProviders(env)).toEqual([]);
    expect(providerWhere(env)).toEqual({});
    expect(providerSql(env, "t")).toBe("");
  });

  it("REQ-3506: plan de regreso: con la bandera en \"false\" el gate C vuelve a esconder a Tangol sin tocar datos", () => {
    expect(hiddenProviders({ TANGOL_ENABLED: "false" })).toEqual(["tangol"]);
    expect(providerSql({ TANGOL_ENABLED: "false" }, "t")).toBe(` AND "t"."providerId" NOT IN ('tangol')`);
  });

  it("REQ-3506: la pasarela del sync sigue con su propia bandera (el sitio no llama a Tangol)", () => {
    const wf = readFileSync(".github/workflows/tangol-sync.yml", "utf8");
    expect(wf).toMatch(/TANGOL_SYNC_ENABLED: "true"/);
    expect(wf).not.toMatch(/TANGOL_ENABLED:/);
  });
});

describe("REQ-3507: prueba de humo con TANGOL_ENABLED encendida (regla 3 del blindaje)", () => {
  const config = parseSmokeConfig(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")));
  const paginas = ["/destinos/ar", "/destinos/ar/bariloche", "/destinos/cl", "/tours?search=bariloche", "/destinos/py"];

  it("REQ-3507: las páginas de los destinos de Tangol van en el humo bajo su bandera", () => {
    expect(config.flagged.TANGOL_ENABLED).toEqual(expect.arrayContaining(paginas));
  });

  it("REQ-3507: con la bandera encendida (entorno del preview o wrangler.jsonc) entran al humo; apagada, no", () => {
    expect(flaggedSmokePages(config.flagged, {}, { TANGOL_ENABLED: "true" })).toEqual(expect.arrayContaining(paginas));
    expect(flaggedSmokePages({ TANGOL_ENABLED: config.flagged.TANGOL_ENABLED }, {}, { TANGOL_ENABLED: "false" })).toEqual([]);
  });

  it("REQ-3507: el humo descubre fichas reales en los destinos de Tangol (obligatorio, sin URL escrita a mano)", () => {
    const reglas = config.flaggedDiscover.TANGOL_ENABLED ?? [];
    const desde = reglas.map((r) => r.from);
    expect(desde).toEqual(expect.arrayContaining(["/destinos/ar/bariloche", "/destinos/cl", "/destinos/py"]));
    for (const r of reglas) {
      expect(r.required).toBe(true);
      // Solo fichas: nunca la página de origen ni una ciudad (eso no probaría una ficha).
      expect(new RegExp(r.pattern).test(r.from)).toBe(false);
      expect(new RegExp(r.pattern).test("/destinos/ar/bariloche")).toBe(false);
    }
    const bariloche = reglas.find((r) => r.from === "/destinos/ar/bariloche");
    expect(new RegExp(bariloche!.pattern).test("/destinos/ar/bariloche/excursion-al-cerro-catedral")).toBe(true);
  });
});
