import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { readAllPages, rowsToTrips, PUBLISHED_PAGE_SIZE } from "./published-pages";

// REQ-1344 (INC-008): /tours mostraba 167 de 236 viajes publicados porque el cargador cortaba en `take: 200`.
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${String(i).padStart(3, "0")}`, ag: i < 44 ? "Fantástica China" : "Otra" }));

describe("REQ-1344: los viajes publicados se leen completos, por páginas", () => {
  it("REQ-1344: 269 publicados → 269 filas en páginas de 100 (sin tope de 200)", async () => {
    const all = rows(269);
    const calls: (string | null)[] = [];
    const fetchPage = vi.fn(async (cursor: string | null, size: number) => {
      calls.push(cursor);
      const start = cursor === null ? 0 : all.findIndex((r) => r.id === cursor) + 1;
      return all.slice(start, start + size);
    });
    const out = await readAllPages(fetchPage);
    expect(PUBLISHED_PAGE_SIZE).toBe(100);
    expect(out).toHaveLength(269);
    expect(out.filter((r) => r.ag === "Fantástica China")).toHaveLength(44);
    expect(calls).toEqual([null, "t099", "t199"]);
  });
  it("REQ-1344: una página exacta termina con una consulta vacía; nunca se cicla", async () => {
    const all = rows(100);
    const fetchPage = vi.fn(async (cursor: string | null, size: number) => (cursor === null ? all.slice(0, size) : []));
    expect(await readAllPages(fetchPage)).toHaveLength(100);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
  it("REQ-1344: un registro malo se descarta y se registra; los demás siguen (blindaje 8)", () => {
    const log = vi.fn();
    const out = rowsToTrips([{ id: "a" }, { id: "malo" }, { id: "c" }], (r) => { if (r.id === "malo") throw new Error("availability inválida"); return { id: r.id }; }, log);
    expect(out.map((t) => t.id)).toEqual(["a", "c"]);
    expect(log).toHaveBeenCalledWith("malo", "availability inválida");
  });
  it("REQ-1344: el cargador ya no corta en 200 ni relee cada viaje (1 consulta por página, no N+1)", () => {
    const src = readFileSync("src/trips/public-load.ts", "utf8");
    expect(src).not.toMatch(/take:\s*200/);
    expect(src).toContain("readAllPages");
    expect(src).not.toContain("repo.findById(r.id)");
    expect(src).toMatch(/cacheKey\("tripCards", \{[^}]*v: "11"/);
  });
});
