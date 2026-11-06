// REQ-470…472: escritura de los geonameid v2 (gate G4). npx vitest run src/geo/lib/escritura.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { leerSqlGeonameid, lotes, sqlValores, sqlEnsayo, sqlRepetidos, gruposAlias, repetidosNoPermitidos, marcarNuevos } from "./escritura";

const ok = (g: number, id: number) => `UPDATE "City" SET "geonameid" = ${g} WHERE "id" = ${id} AND "geonameid" IS NULL;`;

describe("REQ-470: el SQL solo puede llenar geonameid vacíos", () => {
  it("REQ-470: acepta comentarios, líneas vacías y UPDATE … WHERE id = … AND geonameid IS NULL", () => {
    const pares = leerSqlGeonameid(`-- encabezado\n\n${ok(1819729, 5835)}\n${ok(2611396, 6298)}\n`);
    expect(pares).toEqual([{ id: 5835, geonameid: 1819729 }, { id: 6298, geonameid: 2611396 }]);
  });
  it.each([
    'DELETE FROM "City" WHERE "id" = 1;',
    'DROP TABLE "City";',
    'UPDATE "City" SET "slug" = \'x\' WHERE "id" = 1;',
    'UPDATE "City" SET "geonameid" = 1 WHERE "id" = 2;',
    'UPDATE "City" SET "geonameid" = 1, "slug" = \'x\' WHERE "id" = 2 AND "geonameid" IS NULL;',
    `${ok(1, 2)} DELETE FROM "City";`,
    'update "City" set "geonameid" = 1 where "id" = 2 and "geonameid" is null;',
  ])("REQ-470: rechaza cualquier otra línea: %s", (linea) => {
    expect(() => leerSqlGeonameid(`-- x\n${linea}\n`)).toThrow(/línea 2/);
  });
  it("REQ-470: rechaza un id repetido y un archivo sin filas", () => {
    expect(() => leerSqlGeonameid(`${ok(1, 2)}\n${ok(3, 2)}\n`)).toThrow(/repetido/);
    expect(() => leerSqlGeonameid("-- nada\n")).toThrow(/ninguna/);
  });
  it("REQ-470: el SQL vigente (ensayo #3) trae 224 filas, Hong Kong 5835, Tórshavn 6298 y las 4 dudosas con geonameid", () => {
    const pares = leerSqlGeonameid(readFileSync("docs/datos/2026-11-06-geo-v2-geonameid.sql", "utf8"));
    expect(pares).toHaveLength(224);
    const m = new Map(pares.map((p) => [p.id, p.geonameid]));
    expect(m.get(5835)).toBe(1819729);
    expect(m.get(6298)).toBe(2611396);
    expect(m.get(936)).toBe(3624953);
    expect(m.get(2960)).toBe(3985605);
    expect(m.get(2779)).toBe(8199180);
    expect(m.get(4243)).toBe(1120400);
    expect(m.has(3922)).toBe(false); // La Palma: sin-geonameid
  });
});

describe("REQ-471: ensayo con SELECT equivalente y escritura en lotes", () => {
  const pares = Array.from({ length: 53 }, (_, i) => ({ id: i + 1, geonameid: 1000 + i }));
  it("REQ-471: lotes de 25 sentencias, todas iguales a las del archivo", () => {
    const l = lotes(pares, 25);
    expect(l).toHaveLength(3);
    expect(l[2].split("\n")).toHaveLength(3);
    expect(l.join("\n").split("\n").every((s) => /^UPDATE "City" SET "geonameid" = \d+ WHERE "id" = \d+ AND "geonameid" IS NULL;$/.test(s))).toBe(true);
  });
  it("REQ-471: el ensayo cuenta con el mismo WHERE y no escribe", () => {
    const q = sqlEnsayo(pares);
    expect(q).toMatch(/^WITH "v"\("id", "g"\) AS \(VALUES \(1, 1000\), \(2, 1001\)/);
    expect(q).toMatch(/"c"\."geonameid" IS NULL/);
    expect(q).not.toMatch(/UPDATE|DELETE|INSERT|DROP/i);
    expect(sqlRepetidos(pares, true)).not.toMatch(/UPDATE|DELETE|INSERT|DROP/i);
    expect(sqlRepetidos([], false)).not.toMatch(/VALUES/);
    expect(sqlValores(pares.slice(0, 2))).toBe("(1, 1000), (2, 1001)");
  });
});

describe("REQ-472: ningún geonameid se repite donde no debe", () => {
  const alias = gruposAlias("# c\nprovider,provider_city_id,city_key,canonical_city_id,nota\nfreetour,4200,taipei,4200,a\nfreetour,6172,taipei,4200,b\n");
  it("REQ-472: los alias firmados (Taipei 4200/6172) sí pueden compartir geonameid", () => {
    expect(alias).toEqual([[4200, 6172]]);
    expect(repetidosNoPermitidos([{ g: 1668341, ids: "4200,6172", toca: 1 }], alias, [])).toEqual([]);
  });
  it("REQ-472: un repetido que el cambio crea y nadie firmó es un error; con permiso del PO, no", () => {
    const r = [{ g: 1819729, ids: "4855,5835", toca: 1 }];
    expect(repetidosNoPermitidos(r, alias, [])).toEqual(r);
    expect(repetidosNoPermitidos(r, alias, [1819729])).toEqual([]);
  });
  it("REQ-472: un repetido que ya existía y el cambio no toca no se le cobra a este cambio", () => {
    expect(repetidosNoPermitidos([{ g: 2511174, ids: "4016,4040", toca: 0 }], alias, [])).toEqual([]);
  });
  it("REQ-472: después de escribir, solo cuenta como nuevo lo que no estaba igual antes", () => {
    const antes = [{ g: 2511174, ids: "4040,4016", toca: 0 }];
    const despues = [{ g: 2511174, ids: "4016,4040", toca: 0 }, { g: 3687238, ids: "898,5948", toca: 0 }];
    expect(marcarNuevos(antes, despues).map((r) => r.toca)).toEqual([0, 1]);
    expect(repetidosNoPermitidos(marcarNuevos(antes, despues), alias, [])).toHaveLength(1);
  });
});
