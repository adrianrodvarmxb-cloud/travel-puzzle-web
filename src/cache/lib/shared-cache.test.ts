import { describe, it, expect, vi } from "vitest";
import { createSharedCache, cacheKey, type L2Store } from "./shared-cache";

function memL2(): L2Store & { data: Map<string, { at: number; body: string }> } {
  const data = new Map<string, { at: number; body: string }>();
  return {
    data,
    async get(k) { return data.get(k) ?? null; },
    async put(k, v) { data.set(k, v); },
  };
}

describe("INC-003: caché compartida (REQ-032)", () => {
  it("REQ-032: la llave es estable aunque cambie el orden de los campos y omite vacíos", () => {
    expect(cacheKey("tours", { b: 1, a: "x", c: undefined })).toBe(cacheKey("tours", { a: "x", b: 1 }));
    expect(cacheKey("tours", { a: 1 })).not.toBe(cacheKey("tours", { a: 2 }));
  });

  it("REQ-032: peticiones simultáneas comparten UNA sola consulta (single-flight)", async () => {
    let now = 0;
    const c = createSharedCache({ l2: memL2(), now: () => now });
    let calls = 0;
    const load = async () => { calls++; await new Promise((r) => setTimeout(r, 10)); return { n: 1 }; };
    const all = await Promise.all(Array.from({ length: 50 }, () => c.get("k", { ttlSec: 60, staleSec: 600 }, load)));
    expect(calls).toBe(1);
    expect(all.every((x) => x.n === 1)).toBe(true);
  });

  it("REQ-032: un isolate nuevo lee de la caché compartida sin tocar la base", async () => {
    const l2 = memL2();
    let now = 0;
    await createSharedCache({ l2, now: () => now }).get("k", { ttlSec: 60, staleSec: 600 }, async () => ({ v: "a" }));
    now = 30_000;
    const load = vi.fn(async () => ({ v: "b" }));
    expect(await createSharedCache({ l2, now: () => now }).get("k", { ttlSec: 60, staleSec: 600 }, load)).toEqual({ v: "a" });
    expect(load).not.toHaveBeenCalled();
  });

  it("REQ-032: al vencer recarga; si la base falla, sirve la última copia buena (stale-if-error)", async () => {
    const l2 = memL2();
    let now = 0;
    const c = createSharedCache({ l2, now: () => now });
    await c.get("k", { ttlSec: 60, staleSec: 600 }, async () => ({ v: 1 }));
    now = 61_000;
    expect(await c.get("k", { ttlSec: 60, staleSec: 600 }, async () => ({ v: 2 }))).toEqual({ v: 2 });
    now = 200_000;
    expect(await c.get("k", { ttlSec: 60, staleSec: 600 }, async () => { throw new Error("D1 DB is overloaded"); })).toEqual({ v: 2 });
    now = 61_000 + 660_000 + 1; // ttl 60 s + stale 600 s
    await expect(c.get("k", { ttlSec: 60, staleSec: 600 }, async () => { throw new Error("D1 DB is overloaded"); })).rejects.toThrow("overloaded");
  });

  it("REQ-032: si la caché compartida falla, la página sigue con la base", async () => {
    const l2: L2Store = { get: async () => { throw new Error("cache down"); }, put: async () => { throw new Error("cache down"); } };
    const c = createSharedCache({ l2, now: () => 0 });
    expect(await c.get("k", { ttlSec: 60, staleSec: 600 }, async () => ({ ok: true }))).toEqual({ ok: true });
  });
});
