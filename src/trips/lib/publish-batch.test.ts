import { describe, expect, it } from "vitest";
import { checkForPublish, parseD1TripRow, publishSql, restoreSql } from "./publish-batch";

// REQ-1347 (DATOS): publicar los 11 viajes en draft de Turismo Asiático, por workflow, solo los que estén completos.
const raw = (over: Record<string, unknown> = {}) => ({
  id: "ta-1", slug: "pekin-imperial-4-dias-ta-cn-c04-001", agencyId: "ag-ta", kind: "circuito", status: "draft", codeLocked: 0,
  titleEs: "Pekín imperial 4 días", summaryEs: "Resumen", descriptionEs: "Descripción",
  highlights: JSON.stringify(["a", "b", "c"]), includes: JSON.stringify(["Hotel"]), excludes: JSON.stringify(["Vuelos"]),
  countries: JSON.stringify(["CN"]), cities: JSON.stringify(["Pekín"]), durationDays: 4, priceFrom: 899, currency: "USD",
  languages: JSON.stringify(["es"]), options: JSON.stringify([{ id: "o1", name: "Base", mode: "shared", adult: 899 }]),
  meetingPoints: JSON.stringify([{ name: "Hotel", address: "", lat: 39.9, lng: 116.4 }]),
  images: JSON.stringify([{ key: "trips/1730000000000-abc123.jpg", alt: "" }]),
  dates: "[]", itinerary: "[]", extras: "[]", availability: "{}", cancellation: "{}", translations: "{}",
  updatedAt: "2026-11-05T10:00:00.000+00:00", ...over,
});

describe("REQ-1347: revisión previa a publicar (título, precio, destino, imagen + lista del gestor)", () => {
  it("REQ-1347: un viaje completo no tiene faltantes", () => {
    expect(checkForPublish(parseD1TripRow(raw()))).toEqual([]);
  });
  it("REQ-1347: sin precio, sin ciudad, país no ISO o foto con llave inválida → no se publica y dice qué falta", () => {
    expect(checkForPublish(parseD1TripRow(raw({ priceFrom: null })))).toContain("precio");
    expect(checkForPublish(parseD1TripRow(raw({ cities: "[]" })))).toContain("ciudad");
    expect(checkForPublish(parseD1TripRow(raw({ countries: JSON.stringify(["China"]) })))).toContain("país ISO-2");
    expect(checkForPublish(parseD1TripRow(raw({ images: JSON.stringify([{ key: "foto.jpg" }]) })))).toContain("foto válida");
    expect(checkForPublish(parseD1TripRow(raw({ titleEs: " " })))).toContain("título");
  });
  it("REQ-1347: las columnas JSON de D1 llegan como texto y se leen como listas", () => {
    const t = parseD1TripRow(raw());
    expect(t.cities).toEqual(["Pekín"]);
    expect(t.images).toHaveLength(1);
  });
});

describe("REQ-1347: SQL de escritura y de regreso", () => {
  it("REQ-1347: solo UPDATE por id, de esa agencia y en draft; bloquea el código como el gestor", () => {
    const sql = publishSql(["ta-1", "ta-2"], "ag-ta", "2026-11-07T22:00:00.000+00:00");
    expect(sql).toEqual([
      `UPDATE "Trip" SET "status" = 'published', "codeLocked" = 1, "updatedAt" = '2026-11-07T22:00:00.000+00:00' WHERE "id" = 'ta-1' AND "agencyId" = 'ag-ta' AND "status" = 'draft';`,
      `UPDATE "Trip" SET "status" = 'published', "codeLocked" = 1, "updatedAt" = '2026-11-07T22:00:00.000+00:00' WHERE "id" = 'ta-2' AND "agencyId" = 'ag-ta' AND "status" = 'draft';`,
    ]);
  });
  it("REQ-1347: ids o fechas con caracteres raros no generan SQL", () => {
    expect(() => publishSql(["x'; DROP TABLE Trip;--"], "ag-ta", "2026-11-07T22:00:00.000+00:00")).toThrow();
    expect(() => publishSql(["ta-1"], "ag-ta", "ayer")).toThrow();
  });
  it("REQ-1347: el regreso deja cada fila como estaba (status, codeLocked, updatedAt)", () => {
    expect(restoreSql([{ id: "ta-1", status: "draft", codeLocked: 0, updatedAt: "2026-11-05T10:00:00.000+00:00" }])).toEqual([
      `UPDATE "Trip" SET "status" = 'draft', "codeLocked" = 0, "updatedAt" = '2026-11-05T10:00:00.000+00:00' WHERE "id" = 'ta-1';`,
    ]);
  });
});
