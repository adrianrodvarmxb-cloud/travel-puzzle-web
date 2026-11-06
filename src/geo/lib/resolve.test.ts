import { describe, it, expect } from "vitest";
import { parseCityOverrides, resolveCity } from "./resolve";

const CSV = `provider,provider_city_id,accion,geonameid,nota,revisado_por
freetour,1482,asignar,615860,Mestia,PO
freetour,9,no-indexar,,no es ciudad,PO
freetour,10,borrar,,acción inválida,PO
`;

describe("overrides humanos", () => {
  it("REQ-127: lee el CSV y descarta acciones inválidas o «asignar» sin geonameid", () => {
    const o = parseCityOverrides(CSV + "freetour,11,asignar,,falta id,PO\n");
    expect([...o.keys()]).toEqual(["freetour:1482", "freetour:9"]);
  });

  it("REQ-127: ignora comentarios (#) y líneas vacías", () => {
    expect(parseCityOverrides("# solo encabezado\nprovider,provider_city_id,accion,geonameid,nota,revisado_por\n\n").size).toBe(0);
  });
});

describe("resolveCity: prioridad override > id exacto > aproximado", () => {
  const overrides = parseCityOverrides(CSV);
  const auto = { status: "auto" as const, geonameid: 111, reason: "nombre + 3 km" };

  it("REQ-124/REQ-127: el override gana aunque haya id guardado y cruce automático", () => {
    expect(resolveCity({ provider: "freetour", cityId: 1482, storedGeonameid: 5, approx: auto }, overrides)).toMatchObject({ geonameid: 615860, source: "override", status: "auto" });
  });

  it("REQ-127: override «no-indexar» → sin página", () => {
    expect(resolveCity({ provider: "freetour", cityId: 9, storedGeonameid: null, approx: auto }, overrides)).toMatchObject({ status: "sin-pagina", source: "override", geonameid: null });
  });

  it("REQ-124: el id ya guardado gana al aproximado; si difieren se marca para revisión de control", () => {
    expect(resolveCity({ provider: "freetour", cityId: 2, storedGeonameid: 111, approx: auto }, overrides)).toMatchObject({ geonameid: 111, source: "id", controlDiff: false });
    expect(resolveCity({ provider: "freetour", cityId: 2, storedGeonameid: 222, approx: auto }, overrides)).toMatchObject({ geonameid: 222, source: "id", controlDiff: true });
  });

  it("REQ-124: sin override ni id, manda el aproximado", () => {
    expect(resolveCity({ provider: "freetour", cityId: 3, storedGeonameid: null, approx: auto }, overrides)).toMatchObject({ geonameid: 111, source: "aproximado", status: "auto" });
    expect(resolveCity({ provider: "freetour", cityId: 3, storedGeonameid: null, approx: { status: "revisar", geonameid: 7, reason: "x" } }, overrides)).toMatchObject({ geonameid: null, status: "revisar", source: "aproximado" });
  });
});
