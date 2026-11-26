// REQ-10944: lectura de TourOption con SQL aparte; sin la 0036, [] y la ficha sigue. npx vitest run src/tours/options-load.test.ts
import { describe, expect, it, vi } from "vitest";
import { loadTourOptions } from "./options-load";

const db = (impl: () => Promise<{ results: Record<string, unknown>[] }>) => {
  const prepare = vi.fn((sql: string) => ({ bind: (...v: unknown[]) => ({ all: () => { bound.push([sql, v]); return impl(); } }) }));
  const bound: [string, unknown[]][] = [];
  return { db: { prepare }, bound };
};

describe("REQ-10944: loadTourOptions", () => {
  it("REQ-10944: pide solo las columnas públicas de TourOption por tourId y tipa las filas", async () => {
    const { db: d, bound } = db(async () => ({ results: [{ code: "CT", description: "Con traslado", startTime: "08:00", currency: "USD", rackAdult: 52, transferIncluded: 1 }, { code: "" }] }));
    const r = await loadTourOptions(d, "t1");
    expect(r).toEqual([{ code: "CT", description: "Con traslado", startTime: "08:00", currency: "USD", rackAdult: 52, transferIncluded: true }]);
    expect(bound[0][0]).toBe(`SELECT "code", "description", "startTime", "currency", "rackAdult", "transferIncluded" FROM "TourOption" WHERE "tourId" = ?1 ORDER BY "code"`);
    expect(bound[0][1]).toEqual(["t1"]);
    expect(bound[0][0]).not.toMatch(/net|utilidad|comision/i);
  });

  it("REQ-10944: sin la 0036 («no such table») devuelve [] con aviso; otra falla de la base, [] con error; nunca tumba la ficha", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loadTourOptions(db(async () => { throw new Error("D1_ERROR: no such table: TourOption"); }).db, "t1")).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("0036"));
    expect(await loadTourOptions(db(async () => { throw new Error("D1_ERROR: timeout"); }).db, "t1")).toEqual([]);
    expect(error).toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
});
