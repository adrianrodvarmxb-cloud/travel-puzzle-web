import { describe, it, expect } from "vitest";
import { inlineStatement, renderSqlFile, sqlLiteral } from "./sql-file";
import { sqlValue } from "./batch";

describe("REQ-3464: sentencias con parámetros a archivo .sql", () => {
  it("REQ-3464: un texto con apóstrofo se escapa (no rompe el SQL)", () => {
    expect(sqlLiteral("L'Hospitalet")).toBe("'L''Hospitalet'");
    expect(sqlLiteral(null)).toBe("NULL");
    expect(sqlLiteral(undefined)).toBe("NULL");
    expect(sqlLiteral(12.5)).toBe("12.5");
  });

  it("REQ-3464: un valor que no pasó por sqlValue, o un número no finito, falla en vez de generar SQL malo", () => {
    expect(() => sqlLiteral({ a: 1 })).toThrow(/sqlValue/);
    expect(() => sqlLiteral(true)).toThrow(/sqlValue/);
    expect(() => sqlLiteral(Number.NaN)).toThrow(/no finito/);
  });

  it("REQ-3464: los ? se sustituyen en orden y la sentencia termina en ;", () => {
    const sql = inlineStatement({
      sql: 'INSERT INTO "City" ("id", "translations", "slug") VALUES (?, ?, ?)',
      params: [9_000_001, { es: "El Calafate" }, null].map(sqlValue),
    });
    expect(sql).toBe('INSERT INTO "City" ("id", "translations", "slug") VALUES (9000001, \'{"es":"El Calafate"}\', NULL);');
  });

  it("REQ-3464: si sobran o faltan parámetros, falla", () => {
    expect(() => inlineStatement({ sql: "SELECT ?, ?", params: [1] })).toThrow(/faltan parámetros/);
    expect(() => inlineStatement({ sql: "SELECT ?", params: [1, 2] })).toThrow(/sobran 1/);
  });

  it("REQ-3464: el archivo lleva el encabezado comentado y una sentencia por línea", () => {
    const file = renderSqlFile([{ sql: "SELECT ?", params: [1] }, { sql: "SELECT ?", params: ["a"] }], "Tangol: 2 sentencias\nno aplicado");
    expect(file).toBe("-- Tangol: 2 sentencias\n-- no aplicado\nSELECT 1;\nSELECT 'a';\n");
  });
});
