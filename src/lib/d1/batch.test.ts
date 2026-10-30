import { describe, it, expect, vi } from "vitest";
import { sqlDate, upsertRows, runBatch, MAX_PARAMS } from "./batch";

describe("sqlDate", () => {
  it("usa el mismo formato que Prisma en D1", () => {
    expect(sqlDate(new Date("2026-10-30T10:00:00Z"))).toBe("2026-10-30T10:00:00.000+00:00");
  });
});

describe("upsertRows", () => {
  it("arma INSERT ... ON CONFLICT DO UPDATE con columnas entre comillas", () => {
    const [s] = upsertRows("Country", ["id", "code"], [[1, "MX"]], ["id"], ["code"]);
    expect(s.sql).toBe('INSERT INTO "Country" ("id", "code") VALUES (?, ?) ON CONFLICT ("id") DO UPDATE SET "code" = excluded."code"');
    expect(s.params).toEqual([1, "MX"]);
  });

  it("parte en varias sentencias para no pasar de 100 parámetros (límite de D1)", () => {
    const rows = Array.from({ length: 60 }, (_, i) => [i, `C${i}`]);
    const stmts = upsertRows("Country", ["id", "code"], rows, ["id"], ["code"]);
    expect(stmts.length).toBe(2);
    expect(stmts.every((s) => s.params.length <= MAX_PARAMS)).toBe(true);
    expect(stmts.flatMap((s) => s.params).length).toBe(120);
  });

  it("convierte objetos a JSON, fechas a texto, booleanos a 1/0 y undefined a null", () => {
    const [s] = upsertRows("T", ["a", "b", "c", "d"], [[{ x: 1 }, new Date("2026-10-30T10:00:00Z"), true, undefined]], ["a"], ["b"]);
    expect(s.params).toEqual(['{"x":1}', "2026-10-30T10:00:00.000+00:00", 1, null]);
  });

  it("sin filas no genera sentencias", () => {
    expect(upsertRows("T", ["a"], [], ["a"], ["a"])).toEqual([]);
  });
});

describe("runBatch", () => {
  it("manda todo en una sola llamada batch", async () => {
    const bound = vi.fn((...p: unknown[]) => ({ p }));
    const db = { prepare: vi.fn((sql: string) => ({ sql, bind: bound })), batch: vi.fn(async (s: unknown[]) => s) };
    await runBatch(db as never, [{ sql: "A", params: [1] }, { sql: "B", params: [2] }]);
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.prepare).toHaveBeenCalledTimes(2);
  });

  it("no llama a la base si no hay sentencias", async () => {
    const db = { prepare: vi.fn(), batch: vi.fn() };
    await runBatch(db as never, []);
    expect(db.batch).not.toHaveBeenCalled();
  });
});
