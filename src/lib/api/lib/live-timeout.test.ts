import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_TIMEOUT_MS, TIMEOUT_STATUS, esErrorDeTiempo, fetchConLimite } from "./live-timeout";

// REQ-10664 (INC-024): las llamadas en vivo de la ficha de FREETOUR llevan tiempo máximo. Si FREETOUR no responde, la
// petición se cierra, la ficha se queda con lo del sync y la red queda en reposo (el humo ya no la da por «sin respuesta»).
function fetchColgado(): typeof fetch {
  return ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })) as typeof fetch;
}
const fetchRapido = (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch;

describe("REQ-10664: tiempo máximo en las llamadas en vivo a FREETOUR", () => {
  it("REQ-10664: el tope es de 10 segundos y el error de tiempo se marca como 504", () => {
    expect(LIVE_TIMEOUT_MS).toBe(10_000);
    expect(TIMEOUT_STATUS).toBe(504);
  });
  it("REQ-10664: una llamada que no responde se cierra al vencer el tiempo y falla con status 504", async () => {
    const inicio = Date.now();
    const p = fetchConLimite("https://api.ejemplo/evento/1", { headers: { a: "b" } }, 40, fetchColgado());
    await expect(p).rejects.toMatchObject({ status: TIMEOUT_STATUS });
    await expect(p).rejects.toSatisfy((e: unknown) => esErrorDeTiempo(e));
    expect(Date.now() - inicio).toBeLessThan(2_000);
  });
  it("REQ-10664: una llamada que responde a tiempo pasa igual, con sus cabeceras", async () => {
    let vistas: RequestInit | undefined;
    const f = (async (_i: RequestInfo | URL, init?: RequestInit) => { vistas = init; return fetchRapido(_i); }) as typeof fetch;
    const r = await fetchConLimite("https://api.ejemplo/evento/1", { headers: { Authorization: "Bearer x" } }, 1_000, f);
    expect(r.status).toBe(200);
    expect((vistas?.headers as Record<string, string>).Authorization).toBe("Bearer x");
    expect(vistas?.signal).toBeInstanceOf(AbortSignal);
  });
  it("REQ-10664: otros errores de red no se disfrazan de tiempo vencido", async () => {
    const f = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    await expect(fetchConLimite("https://api.ejemplo/x", {}, 1_000, f)).rejects.toThrow("fetch failed");
    expect(esErrorDeTiempo(new TypeError("fetch failed"))).toBe(false);
  });
  it("REQ-10664: el cableado: los proxies de salidas y evento, el hook y la insignia en vivo usan el tope (prueba de cableado, patrón INC-023)", () => {
    const cliente = readFileSync("src/lib/api/freetour-client.ts", "utf8");
    const eventos = cliente.slice(cliente.indexOf("async fetchEventsByTourId"), cliente.indexOf("async fetchEventDetailById"));
    const detalle = cliente.slice(cliente.indexOf("async fetchEventDetailById"));
    expect(eventos.match(/fetchConLimite\(/g)?.length, "fetchEventsByTourId: las dos llamadas (normal y reintento 401)").toBe(2);
    expect(eventos).not.toMatch(/\bawait fetch\(/);
    expect(detalle.match(/fetchConLimite\(/g)?.length, "fetchEventDetailById: las dos llamadas").toBe(2);
    expect(detalle).not.toMatch(/\bawait fetch\(/);
    const hook = readFileSync("src/lib/api/hooks/useEventsByTourFTData.ts", "utf8");
    expect(hook).toMatch(/AbortSignal\.timeout\(LIVE_TIMEOUT_MS\)/);
    expect(hook).toMatch(/TIMEOUT_STATUS/); // no reintenta un tiempo vencido
    const insignia = readFileSync("src/components/tours/one/PrimeraPiezaInfo.tsx", "utf8");
    expect(insignia).toMatch(/AbortSignal\.timeout\(LIVE_TIMEOUT_MS\)/);
  });
});
