// Ficha única, ola 4 «Geografía», decisión 27: llenado de coordenadas de ciudad desde GeoNames y su regreso.
// npx vitest run src/geo/lib/coordenadas-ciudad.test.ts
import { describe, expect, it } from "vitest";
import {
  SQL_COORDENADAS_PERMITIDO,
  SQL_RESTAURAR_PERMITIDO,
  buildCoordenadasSql,
  buildRestaurarSql,
  lineaSqlCoordenadas,
  lineaSqlRestaurar,
  lineasSqlNoPermitidas,
  lotes,
  planCoordenadasCiudad,
  resumenPlan,
  sqlEnsayoCoordenadas,
} from "./coordenadas-ciudad";

const geo = new Map([
  [3435910, { lat: -34.61315, lng: -58.37723 }], // Buenos Aires
  [3860259, { lat: -41.13352, lng: -71.31032 }], // Bariloche
  [999, { lat: 0, lng: 0 }], // fila inválida en GeoNames
]);
const cities = [
  { id: 1, geonameid: 3435910, lat: null, lng: null },
  { id: 2, geonameid: null, lat: null, lng: null },
  { id: 3, geonameid: 3860259, lat: -41.1, lng: -71.3, coordsSource: "manual" },
  { id: 4, geonameid: 777, lat: null, lng: null },
  { id: 5, geonameid: null, lat: null, lng: null },
  { id: 6, geonameid: 999, lat: null, lng: null },
];
const tours = [
  { cityId: 2, coords: "19.4326,-99.1332" },
  { cityId: 2, coords: "19.4340,-99.1400" },
  { cityId: 2, coords: null },
  { cityId: 4, coords: "40.4168,-3.7038" },
  { cityId: 5, coords: null },
];

describe("REQ-10740: plan de llenado de City.lat/lng desde GeoNames con la mediana como respaldo", () => {
  const p = planCoordenadasCiudad(cities, geo, tours);

  it("REQ-10740: GeoNames por geonameid primero, redondeado a 5 decimales, coordsSource = geonames", () => {
    expect(p.plan.find((f) => f.id === 1)).toEqual({ id: 1, lat: -34.61315, lng: -58.37723, coordsSource: "geonames", geonameid: 3435910, puntos: 0 });
  });

  it("REQ-10740: sin geonameid, la mediana de los puntos de encuentro de sus tours (coordsSource = mediana)", () => {
    expect(p.plan.find((f) => f.id === 2)).toEqual({ id: 2, lat: 19.4333, lng: -99.1366, coordsSource: "mediana", geonameid: null, puntos: 3 });
  });

  it("REQ-10740: lo que ya tiene coordenadas (manual) no se toca", () => {
    expect(p.yaConCoordenadas).toEqual([3]);
    expect(p.plan.map((f) => f.id)).not.toContain(3);
  });

  it("REQ-10740: geonameid que cities15000 no trae o trae en 0,0 → mediana si hay puntos; si no, sin dato", () => {
    expect(p.geonameidSinFila).toEqual([4, 6]);
    expect(p.plan.find((f) => f.id === 4)).toMatchObject({ coordsSource: "mediana", geonameid: 777, puntos: 1 });
    expect(p.sinDato).toEqual([5, 6]);
  });

  it("REQ-10740: el plan va ordenado por id y el resumen cuenta cada grupo", () => {
    expect(p.plan.map((f) => f.id)).toEqual([1, 2, 4]);
    expect(resumenPlan(p)).toBe(
      "Ciudades a llenar: 3 (GeoNames 1, mediana de puntos de encuentro 2).\nYa con coordenadas (no se tocan): 1.\nCon geonameid que cities15000 no trae: 2.\nSin dato (quedan en NULL): 2.",
    );
  });

  it("REQ-10740: el SQL solo escribe donde lat IS NULL y pasa la validación línea por línea", () => {
    const sql = buildCoordenadasSql(p.plan, ["REQ-10740 plan del 16-11-2026"]);
    expect(sql.split("\n")[1]).toBe(`UPDATE "City" SET "lat" = -34.61315, "lng" = -58.37723, "coordsSource" = 'geonames' WHERE "id" = 1 AND "lat" IS NULL;`);
    expect(lineasSqlNoPermitidas(sql)).toEqual([]);
    expect(lineasSqlNoPermitidas(`DELETE FROM "City";\n${lineaSqlCoordenadas(p.plan[0])}`)).toEqual([`DELETE FROM "City";`]);
    expect(SQL_COORDENADAS_PERMITIDO.test(`UPDATE "City" SET "lat" = 1, "lng" = 2, "coordsSource" = 'manual' WHERE "id" = 1 AND "lat" IS NULL;`)).toBe(false);
    expect(SQL_COORDENADAS_PERMITIDO.test(`UPDATE "City" SET "lat" = 1, "lng" = 2, "coordsSource" = 'geonames' WHERE "id" = 1;`)).toBe(false);
  });

  it("REQ-10740: lotes de 25 y ensayo de solo lectura con los ids del plan", () => {
    expect(lotes(Array.from({ length: 51 }, (_, i) => i)).map((l) => l.length)).toEqual([25, 25, 1]);
    expect(sqlEnsayoCoordenadas(p.plan)).toContain(`"id" IN (1, 2, 4) AND "lat" IS NULL) AS se_actualizarian`);
    expect(sqlEnsayoCoordenadas([])).toContain(`"id" IN (-1)`);
  });

  it("REQ-10740: una coordenada no finita no genera SQL", () => {
    expect(() => lineaSqlCoordenadas({ id: 1, lat: Number.NaN, lng: 1, coordsSource: "geonames", geonameid: 1, puntos: 0 })).toThrow(/inválida/);
  });
});

describe("REQ-10741: copia de City y SQL de restauración que devuelve cada fila a lo que tenía", () => {
  it("REQ-10741: NULL se restaura como NULL y los valores como estaban; la validación deja pasar solo esas líneas", () => {
    const copia = [
      { id: 1, geonameid: null, lat: null, lng: null, coordsSource: null },
      { id: 3, geonameid: null, lat: -41.1, lng: -71.3, coordsSource: "manual" },
    ];
    const sql = buildRestaurarSql(copia, ["REQ-10741 copia 2026-11-16T21:00:00Z"]);
    expect(sql.split("\n")).toEqual([
      "-- REQ-10741 copia 2026-11-16T21:00:00Z",
      `UPDATE "City" SET "lat" = NULL, "lng" = NULL, "coordsSource" = NULL WHERE "id" = 1;`,
      `UPDATE "City" SET "lat" = -41.1, "lng" = -71.3, "coordsSource" = 'manual' WHERE "id" = 3;`,
      "",
    ]);
    expect(lineasSqlNoPermitidas(sql, SQL_RESTAURAR_PERMITIDO)).toEqual([]);
    expect(lineasSqlNoPermitidas(`DROP TABLE "City";`, SQL_RESTAURAR_PERMITIDO)).toEqual([`DROP TABLE "City";`]);
    expect(lineaSqlRestaurar({ id: 9, geonameid: null, lat: 1, lng: 2, coordsSource: "o'brien" })).toContain(`'o''brien'`);
  });
});
