import { describe, it, expect, vi } from "vitest";
import { isD1Overloaded, withRetry, createTtlCache, countriesWithCounts } from "./d1-load";

describe("INC-003: carga de D1", () => {
  it("REQ-029: detecta el error de D1 saturada (también envuelto en otro error)", () => {
    expect(isD1Overloaded(new Error("D1_ERROR: D1 DB is overloaded. Too many resources consumed within a 10 second window"))).toBe(true);
    const wrapped = Object.assign(new Error("DriverAdapterError"), { cause: new Error("D1 DB is overloaded") });
    expect(isD1Overloaded(wrapped)).toBe(true);
    expect(isD1Overloaded(new Error("no such table"))).toBe(false);
  });

  it("REQ-029: reintenta solo cuando D1 está saturada y respeta el número de intentos", async () => {
    const sleep = vi.fn(async () => {});
    let n = 0;
    const ok = await withRetry(async () => { if (++n < 3) throw new Error("D1 DB is overloaded"); return "ok"; }, { tries: 3, sleep });
    expect(ok).toBe("ok");
    expect(sleep).toHaveBeenCalledTimes(2);
    await expect(withRetry(async () => { throw new Error("D1 DB is overloaded"); }, { tries: 2, sleep })).rejects.toThrow("overloaded");
    let m = 0;
    await expect(withRetry(async () => { m++; throw new Error("otra cosa"); }, { tries: 3, sleep })).rejects.toThrow("otra cosa");
    expect(m).toBe(1);
  });

  it("REQ-030: la caché por tiempo reutiliza el valor y lo renueva al vencer; no guarda errores", async () => {
    let now = 0;
    const cache = createTtlCache<string>({ ttlMs: 1000, now: () => now });
    const load = vi.fn(async () => `v${now}`);
    expect(await cache.get("es", load)).toBe("v0");
    now = 999;
    expect(await cache.get("es", load)).toBe("v0");
    expect(load).toHaveBeenCalledTimes(1);
    now = 1000;
    expect(await cache.get("es", load)).toBe("v1000");
    const bad = vi.fn(async () => { throw new Error("x"); });
    await expect(cache.get("en", bad)).rejects.toThrow("x");
    await expect(cache.get("en", bad)).rejects.toThrow("x");
    expect(bad).toHaveBeenCalledTimes(2);
  });

  it("REQ-031: arma países con su conteo desde un solo GROUP BY, sin países vacíos y ordenados por id", () => {
    const countries = [
      { id: 3, code: "fr", translations: { es: "Francia" } },
      { id: 1, code: "it", translations: { es: "Italia" } },
      { id: 2, code: "xx", translations: {} },
    ];
    const groups = [{ countryId: 3, _count: { _all: 5 } }, { countryId: 1, _count: { _all: 2 } }, { countryId: 99, _count: { _all: 1 } }];
    expect(countriesWithCounts(countries, groups)).toEqual([
      { id: 1, code: "it", translations: { es: "Italia" }, _count: { tours: 2 } },
      { id: 3, code: "fr", translations: { es: "Francia" }, _count: { tours: 5 } },
    ]);
  });
});
