import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCityOverrides, resolveCity } from "./resolve";
import { parseCsv } from "./csv";

const CSV = `provider,provider_city_id,accion,geonameid,nota,revisado_por
freetour,1482,asignar,615860,Mestia,PO
freetour,9,no-indexar,,no es ciudad,PO
freetour,10,borrar,,acción inválida,PO
`;

describe("overrides humanos", () => {
  it("REQ-136: lee el CSV y descarta acciones inválidas o «asignar» sin geonameid", () => {
    const o = parseCityOverrides(CSV + "freetour,11,asignar,,falta id,PO\n");
    expect([...o.keys()]).toEqual(["freetour:1482", "freetour:9"]);
  });

  it("REQ-136: ignora comentarios (#) y líneas vacías", () => {
    expect(parseCityOverrides("# solo encabezado\nprovider,provider_city_id,accion,geonameid,nota,revisado_por\n\n").size).toBe(0);
  });
});

describe("resolveCity: prioridad override > id exacto > aproximado", () => {
  const overrides = parseCityOverrides(CSV);
  const auto = { status: "auto" as const, geonameid: 111, reason: "nombre + 3 km" };

  it("REQ-133/REQ-136: el override gana aunque haya id guardado y cruce automático", () => {
    expect(resolveCity({ provider: "freetour", cityId: 1482, storedGeonameid: 5, approx: auto }, overrides)).toMatchObject({ geonameid: 615860, source: "override", status: "auto" });
  });

  it("REQ-136: override «no-indexar» → sin página", () => {
    expect(resolveCity({ provider: "freetour", cityId: 9, storedGeonameid: null, approx: auto }, overrides)).toMatchObject({ status: "sin-pagina", source: "override", geonameid: null });
  });

  it("REQ-133: el id ya guardado gana al aproximado; si difieren se marca para revisión de control", () => {
    expect(resolveCity({ provider: "freetour", cityId: 2, storedGeonameid: 111, approx: auto }, overrides)).toMatchObject({ geonameid: 111, source: "id", controlDiff: false });
    expect(resolveCity({ provider: "freetour", cityId: 2, storedGeonameid: 222, approx: auto }, overrides)).toMatchObject({ geonameid: 222, source: "id", controlDiff: true });
  });

  it("REQ-133: sin override ni id, manda el aproximado", () => {
    expect(resolveCity({ provider: "freetour", cityId: 3, storedGeonameid: null, approx: auto }, overrides)).toMatchObject({ geonameid: 111, source: "aproximado", status: "auto" });
    expect(resolveCity({ provider: "freetour", cityId: 3, storedGeonameid: null, approx: { status: "revisar", geonameid: 7, reason: "x" } }, overrides)).toMatchObject({ geonameid: null, status: "revisar", source: "aproximado" });
  });
});

describe("src/geo/data/city-overrides.csv (gate G7: Claude propone, el PO firma)", () => {
  const text = readFileSync("src/geo/data/city-overrides.csv", "utf8");
  const rows = parseCsv(text);
  const parsed = parseCityOverrides(text);

  it("REQ-141: cada fila es válida (ninguna se descarta), sin ids repetidos, con nota y revisor", () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(parsed.size).toBe(rows.length);
    for (const r of rows) {
      expect(r.provider).toBe("freetour");
      expect(r.nota.length).toBeGreaterThan(3);
      expect(r.revisado_por).toMatch(/Claude/);
    }
  });

  it("REQ-141: «asignar» lleva geonameid; «sin-geonameid» no lleva; no hay «no-indexar» sin firma", () => {
    for (const r of rows) {
      if (r.accion === "asignar") expect(Number(r.geonameid)).toBeGreaterThan(0);
      else expect(r.geonameid).toBe("");
      expect(["asignar", "sin-geonameid"]).toContain(r.accion);
    }
  });

  it("REQ-141: las dudosas quedan fuera (Alajuela, San Luis Potosí, La Palma, Diani, Krabi Ao Nang)", () => {
    for (const id of [936, 2960, 3922, 2779, 4243]) expect(parsed.has(`freetour:${id}`)).toBe(false);
  });
});
