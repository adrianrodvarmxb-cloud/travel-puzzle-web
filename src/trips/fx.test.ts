import { describe, it, expect, vi } from "vitest";
import { getFxRates, parseBanxico } from "./fx";

const body = { bmx: { series: [
  { idSerie: "SF43718", datos: [{ fecha: "03/11/2026", dato: "18.4512" }] },
  { idSerie: "SF46410", datos: [{ fecha: "03/11/2026", dato: "20.1034" }] },
] } };

describe("Banxico FIX", () => {
  it("lee USD y EUR", () => {
    expect(parseBanxico(body)).toEqual({ USD: 18.4512, EUR: 20.1034, date: "03/11/2026" });
    expect(parseBanxico({ bmx: { series: [] } })).toBeNull();
    expect(parseBanxico({ bmx: { series: [{ idSerie: "SF43718", datos: [{ fecha: "x", dato: "N/E" }] }] } })).toBeNull();
  });
  it("usa la caché del día; si no hay, consulta con el token en el encabezado (nunca en la URL)", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(body)));
    const cache = { get: vi.fn(async () => null), put: vi.fn(async () => {}) };
    const r = await getFxRates({ token: "tok", fetch, cache });
    expect(r?.USD).toBe(18.4512);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("tok");
    expect((init.headers as Record<string, string>)["Bmx-Token"]).toBe("tok");
    expect(cache.put).toHaveBeenCalled();
    const cached = { get: vi.fn(async () => ({ USD: 1, EUR: 2, date: "d" })), put: vi.fn() };
    expect(await getFxRates({ token: "tok", fetch, cache: cached })).toEqual({ USD: 1, EUR: 2, date: "d" });
  });
  it("sin token o si Banxico falla: null (se muestra la moneda original)", async () => {
    const cache = { get: vi.fn(async () => null), put: vi.fn() };
    expect(await getFxRates({ token: "", fetch: vi.fn(), cache })).toBeNull();
    expect(await getFxRates({ token: "t", fetch: vi.fn(async () => { throw new Error("x"); }), cache })).toBeNull();
  });
});
