import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { LIVE_READ_TIMEOUT_MS, liveFetch } from "./live-fetch";

// REQ-10666 (INC-024): una llamada en vivo al proveedor que no contesta tiene que fallar rápido; sin límite de
// tiempo la petición de la ficha se queda abierta, el cliente espera sin tope y el humo vence su espera de red.
const colgado = (() => (_url: string, init?: RequestInit) => new Promise<Response>((_ok, fail) => {
  init?.signal?.addEventListener("abort", () => fail(new DOMException("aborted", "AbortError")));
})) as unknown as () => typeof fetch;

describe("REQ-10666: límite de tiempo en las llamadas en vivo al proveedor", () => {
  it("REQ-10666: si el proveedor no contesta, corta al vencer el plazo con estado 504", async () => {
    const t0 = Date.now();
    const err = await liveFetch("https://proveedor.test/tours/1/events", {}, { ms: 30, fetchImpl: colgado() }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { status?: number }).status).toBe(504);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect((err as Error).message).not.toMatch(/free ?tour/i); // el mensaje puede llegar al navegador
  });
  it("REQ-10666: si contesta a tiempo, entrega la respuesta tal cual y conserva método, cabeceras y cuerpo", async () => {
    const fetchImpl = vi.fn(async () => new Response('{"ok":true}', { status: 200 })) as unknown as typeof fetch;
    const r = await liveFetch("https://proveedor.test/x", { method: "POST", headers: { a: "b" }, body: "z" }, { ms: 1000, fetchImpl });
    expect(r.status).toBe(200);
    const init = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1];
    expect(init).toMatchObject({ method: "POST", headers: { a: "b" }, body: "z" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it("REQ-10666: un error que no es del plazo sale sin cambiar", async () => {
    const fetchImpl = (async () => { throw new TypeError("sin red"); }) as unknown as typeof fetch;
    await expect(liveFetch("https://proveedor.test/x", {}, { ms: 1000, fetchImpl })).rejects.toThrow("sin red");
  });
  it("REQ-10666: el plazo por omisión es de 10 segundos", () => {
    expect(LIVE_READ_TIMEOUT_MS).toBe(10_000);
  });
  it("REQ-10666: las lecturas en vivo de la ficha y el inicio de sesión pasan por liveFetch; el sync y la reserva no", () => {
    const src = readFileSync("src/lib/api/freetour-client.ts", "utf8");
    for (const ruta of ["/login`", "/tours/${tourId}`", "/tours/${tourId}/events`", "/event/${eventId}`"]) {
      const usos = src.split("\n").filter((l) => l.includes(ruta) && /fetch\(/i.test(l));
      expect(usos.length, ruta).toBeGreaterThan(0);
      for (const l of usos) expect(l, ruta).toContain("liveFetch(");
    }
    for (const l of src.split("\n").filter((x) => /tours\?page=|\/countries`|\/cities\//.test(x) && /fetch\(/i.test(x))) expect(l).not.toContain("liveFetch(");
  });
});
