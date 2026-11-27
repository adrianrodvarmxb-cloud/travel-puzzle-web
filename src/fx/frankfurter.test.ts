// REQ-10874: lectura de Frankfurter con caché y sin tumbar nada si falla. npx vitest run src/fx/frankfurter.test.ts
import { describe, expect, it, vi } from "vitest";
import { FRANKFURTER_URL, getFrankfurter } from "./frankfurter";
import type { FxTable } from "@/ficha/lib/local-price";

const body = { amount: 1, base: "EUR", date: "2026-11-24", rates: { USD: 1.1, MXN: 20, ARS: 1100 } };
const memCache = (initial: FxTable | null = null) => {
  let stored = initial;
  return { get: async () => stored, put: async (t: FxTable) => { stored = t; }, stored: () => stored };
};

describe("REQ-10874: Frankfurter (BCE) con caché de medio día", () => {
  it("REQ-10874: pide `latest` con base EUR, guarda la tabla en caché y la devuelve", async () => {
    const urls: string[] = [];
    const fetch = vi.fn(async (url: string) => { urls.push(url); return new Response(JSON.stringify(body), { status: 200 }); });
    const cache = memCache();
    const t = await getFrankfurter({ fetch, cache });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(urls).toEqual([FRANKFURTER_URL]);
    expect(t).toEqual({ base: "EUR", date: "2026-11-24", rates: body.rates });
    expect(cache.stored()).toEqual(t);
  });

  it("REQ-10874: con caché no llama a la red", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 500 }));
    const cached = { base: "EUR", date: "2026-11-23", rates: { USD: 1.09 } };
    expect(await getFrankfurter({ fetch, cache: memCache(cached) })).toEqual(cached);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("REQ-10874: respuesta no 200, JSON malo o red caída → null (nunca una tasa inventada ni una excepción)", async () => {
    expect(await getFrankfurter({ fetch: async () => new Response("x", { status: 503 }), cache: memCache() })).toBeNull();
    expect(await getFrankfurter({ fetch: async () => new Response("no json", { status: 200 }), cache: memCache() })).toBeNull();
    expect(await getFrankfurter({ fetch: async () => { throw new Error("red"); }, cache: memCache() })).toBeNull();
    expect(await getFrankfurter({ fetch: async () => new Response(JSON.stringify({ base: "EUR" }), { status: 200 }), cache: memCache() })).toBeNull();
  });
});
