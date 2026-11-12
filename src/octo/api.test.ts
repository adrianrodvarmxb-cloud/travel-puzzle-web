import { describe, it, expect, vi } from "vitest";
import { createOctoApi, OctoError } from "./api";
import { VENTRATA_OCTO_BASE_URL } from "./lib/config";
import { sampleBooking, sampleProduct } from "./lib/fixtures";

const config = { baseUrl: VENTRATA_OCTO_BASE_URL, apiKey: "test-key", env: "test" as const };

type Reply = { json: unknown; status?: number; headers?: Record<string, string> };
function fakeFetch(...replies: Reply[]) {
  let i = 0;
  return vi.fn(async (_url: string, _init?: RequestInit) => {
    const r = replies[Math.min(i++, replies.length - 1)];
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: r.headers });
  });
}
const call = (f: ReturnType<typeof fakeFetch>, n = 0) => {
  const [url, init] = f.mock.calls[n];
  return { url, init: init!, headers: init!.headers as Record<string, string>, body: init!.body ? JSON.parse(String(init!.body)) : undefined };
};

describe("createOctoApi (Ventrata OCTO, Big Bus)", () => {
  it("REQ-3326: llama a api.ventrata.com/octo con Bearer, precios y modo prueba", async () => {
    const f = fakeFetch({ json: { id: "sup" } });
    await createOctoApi({ config, fetch: f as unknown as typeof fetch }).getSupplier();
    const { url, init, headers } = call(f);
    expect(url).toBe("https://api.ventrata.com/octo/supplier");
    expect(init.method).toBe("GET");
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["Octo-Capabilities"]).toBe("octo/pricing");
    expect(headers["Octo-Env"]).toBe("test");
  });

  it("REQ-3326: lee todo el catálogo siguiendo Octo-Next-Page y descarta lo inválido", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = fakeFetch(
      { json: [sampleProduct()], headers: { "Octo-Next-Page": "cur 2" } },
      { json: [{ ...sampleProduct(), id: "p2" }, { id: "" }] },
    );
    const r = await createOctoApi({ config, fetch: f as unknown as typeof fetch }).getProducts();
    expect(r.items.map((p) => p.id)).toEqual(["prod-hoho-nyc", "p2"]);
    expect(r.discarded).toBe(1);
    expect(r.raw).toHaveLength(3);
    expect(call(f, 0).url).toBe("https://api.ventrata.com/octo/products?limit=100");
    expect(call(f, 1).url).toBe("https://api.ventrata.com/octo/products?limit=100&page=cur%202");
    warn.mockRestore();
  });

  it("REQ-3326: no se queda en un ciclo infinito si el catálogo no termina", async () => {
    const f = fakeFetch({ json: [], headers: { "Octo-Next-Page": "x" } });
    await expect(createOctoApi({ config, fetch: f as unknown as typeof fetch, maxPages: 3 }).getProducts()).rejects.toMatchObject({
      errorCode: "TOO_MANY_PAGES",
    });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("REQ-3326: apartar manda una unidad por persona, nuestro uuid y la referencia de Travel Puzzle", async () => {
    const f = fakeFetch({ json: sampleBooking({ status: "ON_HOLD" }) });
    const b = await createOctoApi({ config, fetch: f as unknown as typeof fetch }).reserve({
      uuid: "11111111-2222-4333-8444-555555555555",
      productId: "prod-hoho-nyc",
      optionId: "DEFAULT",
      availabilityId: "2026-12-01T00:00:00-05:00",
      units: [{ id: "unit-adult", quantity: 2 }],
      resellerReference: "TP-20261112-001",
    });
    const { url, init, headers, body } = call(f);
    expect(url).toBe("https://api.ventrata.com/octo/bookings");
    expect(init.method).toBe("POST");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(body.unitItems).toEqual([{ unitId: "unit-adult" }, { unitId: "unit-adult" }]);
    expect(body).toMatchObject({ uuid: "11111111-2222-4333-8444-555555555555", resellerReference: "TP-20261112-001", expirationMinutes: 45 });
    expect(b.status).toBe("ON_HOLD");
  });

  it("REQ-3326: confirmar no pide el correo de Big Bus (marca Travel Puzzle) y cancelar va por API", async () => {
    const f = fakeFetch({ json: sampleBooking() }, { json: sampleBooking({ status: "CANCELLED" }) });
    const api = createOctoApi({ config, fetch: f as unknown as typeof fetch });
    await api.confirm("abc", { contact: { fullName: "Ana G", emailAddress: "ana@example.test" }, resellerReference: "TP-1" });
    expect(call(f, 0).url).toBe("https://api.ventrata.com/octo/bookings/abc/confirm");
    expect(call(f, 0).body).toMatchObject({ emailReceipt: false, resellerReference: "TP-1" });
    const c = await api.cancel("abc", "El cliente canceló");
    expect(call(f, 1).url).toBe("https://api.ventrata.com/octo/bookings/abc/cancel");
    expect(c.status).toBe("CANCELLED");
  });

  it("REQ-3436: la disponibilidad se pide en dólares cuando se indica la moneda", async () => {
    const f = fakeFetch({ json: [] });
    await createOctoApi({ config, fetch: f as unknown as typeof fetch }).availability({ productId: "p", optionId: "o", localDateStart: "2026-12-01", localDateEnd: "2026-12-01", currency: "USD" });
    expect(call(f).url).toBe("https://api.ventrata.com/octo/availability");
    expect(call(f).body).toMatchObject({ productId: "p", currency: "USD" });
  });

  it("REQ-3453: actualizar manda PATCH solo con lo que cambia (personas como una unidad por persona)", async () => {
    const f = fakeFetch({ json: sampleBooking() });
    const api = createOctoApi({ config, fetch: f as unknown as typeof fetch });
    await api.update("abc", { availabilityId: "2026-12-02T00:00:00-05:00", units: [{ id: "unit-adult", quantity: 3 }] });
    const { url, init, body } = call(f);
    expect(url).toBe("https://api.ventrata.com/octo/bookings/abc");
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ availabilityId: "2026-12-02T00:00:00-05:00", unitItems: [{ unitId: "unit-adult" }, { unitId: "unit-adult" }, { unitId: "unit-adult" }] });
    await expect(api.update("abc", {})).rejects.toMatchObject({ errorCode: "EMPTY_UPDATE" });
  });

  it("REQ-3326: un error de Ventrata conserva su status y su código", async () => {
    const f = fakeFetch({ json: { error: "INVALID_AVAILABILITY_ID", errorMessage: "Sin lugar" }, status: 400, headers: { "Ventrata-Error-Code": "INVALID_AVAILABILITY_ID" } });
    const p = createOctoApi({ config, fetch: f as unknown as typeof fetch }).getBooking("x");
    await expect(p).rejects.toBeInstanceOf(OctoError);
    await expect(p).rejects.toMatchObject({ status: 400, errorCode: "INVALID_AVAILABILITY_ID", message: "Sin lugar" });
  });

  it("REQ-3326: una reserva con forma inválida no pasa como buena", async () => {
    const f = fakeFetch({ json: { uuid: "x" } });
    await expect(createOctoApi({ config, fetch: f as unknown as typeof fetch }).getBooking("x")).rejects.toMatchObject({
      errorCode: "INVALID_RESPONSE",
    });
  });
});
