import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSharedCache, type L2Store } from "./shared-cache";
import { previousVersionKeys } from "./versions";

// REQ-1359 (INC-009): tras un cambio de versión de la llave (p. ej. `destinos` v9 → v10), la primera petición no espera
// a reconstruir el árbol (11–18 s en frío): se sirve la copia anterior y la nueva se arma en segundo plano (waitUntil).
function memL2(): L2Store & { data: Map<string, { at: number; body: string }> } {
  const data = new Map<string, { at: number; body: string }>();
  return { data, async get(k) { return data.get(k) ?? null; }, async put(k, v) { data.set(k, v); } };
}
const POLICY = { ttlSec: 300, staleSec: 3600 };
const SLOW_MS = 200; // la reconstrucción «en frío» del árbol, a escala

describe("REQ-1359: copia anterior mientras se arma la nueva", () => {
  it("REQ-1359: con la llave nueva vacía y la anterior en L2, responde al instante con la anterior y arma la nueva en segundo plano", async () => {
    let now = 1_000_000;
    const l2 = memL2();
    l2.data.set("destinos?v=9", { at: now - 60_000, body: JSON.stringify({ v: 9 }) });
    const c = createSharedCache({ l2, now: () => now });
    const bg: Promise<unknown>[] = [];
    let loads = 0;
    const load = async () => { loads++; await new Promise((r) => setTimeout(r, SLOW_MS)); return { v: 10 }; };
    const t0 = performance.now();
    const first = await c.get("destinos?v=10", POLICY, load, { previousKeys: ["destinos?v=9"], background: (p) => bg.push(p), accept: (x) => typeof (x as { v?: unknown }).v === "number" });
    const ms = performance.now() - t0;
    expect(first).toEqual({ v: 9 });
    expect(ms).toBeLessThan(SLOW_MS / 2);
    expect(bg).toHaveLength(1);
    await Promise.all(bg);
    expect(loads).toBe(1);
    expect(JSON.parse(l2.data.get("destinos?v=10")!.body)).toEqual({ v: 10 });
    now += 1000;
    expect(await c.get("destinos?v=10", POLICY, load, { previousKeys: ["destinos?v=9"], background: (p) => bg.push(p) })).toEqual({ v: 10 });
    expect(loads).toBe(1);
  });
  it("REQ-1359: mientras se arma la nueva, otras peticiones también reciben la anterior y no lanzan otra reconstrucción", async () => {
    const now = 1_000_000;
    const l2 = memL2();
    l2.data.set("k?v=1", { at: now - 1000, body: JSON.stringify({ v: 1 }) });
    const c = createSharedCache({ l2, now: () => now });
    const bg: Promise<unknown>[] = [];
    let loads = 0;
    const load = async () => { loads++; await new Promise((r) => setTimeout(r, SLOW_MS)); return { v: 2 }; };
    const opts = { previousKeys: ["k?v=1"], background: (p: Promise<unknown>) => bg.push(p) };
    const r = await Promise.all(Array.from({ length: 5 }, () => c.get("k?v=2", POLICY, load, opts)));
    expect(r.every((x) => (x as { v: number }).v === 1)).toBe(true);
    await Promise.all(bg);
    expect(loads).toBe(1);
  });
  it("REQ-1359: una copia anterior con otra forma (accept = false) no se sirve: se espera la nueva, como hoy", async () => {
    const l2 = memL2();
    l2.data.set("k?v=1", { at: Date.now() - 1000, body: JSON.stringify({ viejo: true }) });
    const c = createSharedCache({ l2 });
    const out = await c.get("k?v=2", POLICY, async () => ({ v: 2 }), { previousKeys: ["k?v=1"], background: () => {}, accept: (x) => "v" in (x as object) });
    expect(out).toEqual({ v: 2 });
  });
  it("REQ-1359: sin waitUntil (build, tests) se comporta como hoy: espera la nueva", async () => {
    const l2 = memL2();
    l2.data.set("k?v=1", { at: Date.now() - 1000, body: JSON.stringify({ v: 1 }) });
    const c = createSharedCache({ l2 });
    expect(await c.get("k?v=2", POLICY, async () => ({ v: 2 }), { previousKeys: ["k?v=1"] })).toEqual({ v: 2 });
  });
  it("REQ-1359: la llave anterior sale sola de la versión (v10 → v9, v8, v7)", () => {
    expect(previousVersionKeys("destinos", { v: "10", own: "true" }, 3)).toEqual(["destinos?own=true&v=9", "destinos?own=true&v=8", "destinos?own=true&v=7"]);
    expect(previousVersionKeys("destinos", { v: "1" }, 3)).toEqual([]);
  });
  it("REQ-1359: /destinos usa la copia anterior (getDestinations pasa previousKeys y la revisión de forma)", () => {
    const src = readFileSync("src/destinations/server.ts", "utf8");
    expect(src).toMatch(/previousVersionKeys\("destinos"/);
    expect(src).toMatch(/isDestinationTree/);
  });
});
