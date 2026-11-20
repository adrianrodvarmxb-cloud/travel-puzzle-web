import { describe, expect, it } from "vitest";
import { fichaEjemplo } from "./lib/fixtures";
import { loadFicha, loadFlags } from "./load";

const now = () => new Date("2026-11-20T09:00:00Z");

describe("REQ-10827: lectura de la ficha con base, banderas y reloj por parámetro", () => {
  it("REQ-10827: una ficha válida vuelve con la hora de lectura", async () => {
    const r = await loadFicha({ source: async () => fichaEjemplo(), flags: { qualityGate: false }, now });
    expect(r).toMatchObject({ ok: true, readAt: "2026-11-20T09:00:00.000Z" });
    if (r.ok) expect(r.ficha.title).toBe("Tour de ejemplo");
  });

  it("REQ-10827: sin fila es not-found; nada se inventa", async () => {
    expect(await loadFicha({ source: async () => null, flags: { qualityGate: false }, now })).toEqual({ ok: false, reason: "not-found", detail: null });
  });

  it("REQ-10827: un registro malo o con un campo privado se descarta, se registra y no tumba (blindaje 8)", async () => {
    const logs: unknown[] = [];
    const malo = { ...fichaEjemplo(), net: 70 };
    const r = await loadFicha({ source: async () => malo, flags: { qualityGate: false }, now, log: (e) => logs.push(e) });
    expect(r).toEqual({ ok: false, reason: "invalid", detail: "campo privado en el modelo: net" });
    expect(logs).toEqual([{ kind: "invalid", reason: "campo privado en el modelo: net" }]);
    const roto = await loadFicha({ source: async () => ({ id: 1 }), flags: { qualityGate: false }, now });
    expect(roto.ok).toBe(false);
  });

  it("REQ-10827: el mínimo de calidad oculta solo con la bandera encendida y solo tours por API (decisión 50)", async () => {
    const sinFoto = fichaEjemplo(); sinFoto.provider = "tangol"; sinFoto.gallery = [];
    expect((await loadFicha({ source: async () => sinFoto, flags: { qualityGate: false }, now })).ok).toBe(true);
    const r = await loadFicha({ source: async () => sinFoto, flags: { qualityGate: true }, now });
    expect(r).toEqual({ ok: false, reason: "hidden", detail: "mínimo de calidad" });
    const viaje = fichaEjemplo(); viaje.provider = "agencia:tas"; viaje.gallery = [];
    expect((await loadFicha({ source: async () => viaje, flags: { qualityGate: true }, now })).ok).toBe(true);
  });

  it("REQ-10827: las banderas salen del diccionario que pasa quien llama; apagada por omisión", () => {
    expect(loadFlags({})).toEqual({ qualityGate: false });
    expect(loadFlags({ PROVIDER_QUALITY_GATE_ENABLED: "true" })).toEqual({ qualityGate: true });
    expect(loadFlags({ PROVIDER_QUALITY_GATE_ENABLED: "false" })).toEqual({ qualityGate: false });
  });
});
