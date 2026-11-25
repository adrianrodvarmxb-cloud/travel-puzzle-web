// REQ-10874: /api/precio-local calcula el precio local fuera del HTML en caché. npx vitest run src/ficha/precio-local-route.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/fx/table", () => ({
  loadFxTable: async () => ({ base: "MXN", date: "2026-11-24", rates: { USD: 1 / 18.5, EUR: 1 / 21, ARS: 1100 / 21 } }),
}));
const { GET } = await import("@/app/api/precio-local/route");

const env = process.env as Record<string, string | undefined>;
const req = (qs: string, headers: Record<string, string> = {}) => new NextRequest(`https://travelpuzzle.com.mx/api/precio-local?${qs}`, { headers });

describe("REQ-10874: precio en la moneda del visitante por ruta (ola 9, decisión 32)", () => {
  beforeEach(() => { env.LOCAL_CURRENCY_ENABLED = "true"; });
  afterEach(() => { delete env.LOCAL_CURRENCY_ENABLED; });

  it("REQ-10874: visitante argentino ve pesos argentinos aproximados y la moneda del cargo; la respuesta no se guarda en ningún caché", async () => {
    const res = await GET(req("amount=98&currency=USD&per=person&lang=es", { "cf-ipcountry": "AR" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const r = await res.json();
    expect(r.country).toBe("AR");
    expect(r.shown.currency).toBe("ARS");
    expect(r.shown.approx).toBe(true);
    expect(r.shown.amount).toBe(Math.ceil(98 * 18.5 * (1100 / 21)));
    expect(r.charge).toEqual({ amount: 98, currency: "USD" });
    expect(r.text).toMatch(/^ARS \$[\d,]+ aprox\. por persona · se cobra en USD \$98$/);
    expect(r.date).toBe("2026-11-24");
  });

  it("REQ-10874: sin país (sin cabecera o XX) manda la moneda del proveedor; gratis no cobra", async () => {
    const r = await (await GET(req("amount=98&currency=USD&lang=en"))).json();
    expect(r.country).toBeNull();
    expect(r.text).toBe("USD $98 per person · charged in USD");
    const xx = await (await GET(req("amount=98&currency=USD", { "cf-ipcountry": "XX" }))).json();
    expect(xx.shown.currency).toBe("USD");
    const free = await (await GET(req("amount=0&currency=EUR", { "cf-ipcountry": "MX" }))).json();
    expect(free).toMatchObject({ text: "Gratis", charge: null });
  });

  it("REQ-10874: consulta inválida → 400; bandera apagada → 404 (el panel se queda con la moneda del proveedor)", async () => {
    expect((await GET(req("amount=-5&currency=USD"))).status).toBe(400);
    expect((await GET(req("currency=USD"))).status).toBe(400);
    env.LOCAL_CURRENCY_ENABLED = "false";
    expect((await GET(req("amount=98&currency=USD", { "cf-ipcountry": "MX" }))).status).toBe(404);
  });

  it("REQ-10874: la respuesta nunca trae neto ni margen (solo el monto público que llegó)", async () => {
    const r = JSON.stringify(await (await GET(req("amount=98&currency=USD", { "cf-ipcountry": "MX" }))).json());
    expect(r).not.toMatch(/neto|netPrice|margen|markup/i);
  });
});
