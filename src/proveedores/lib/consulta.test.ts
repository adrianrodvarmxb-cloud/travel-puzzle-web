// REQ-3430: Mila y la revisión cada 6 h se consultan antes de escribirle a un proveedor (REQ-3429, gate G1 = A).
import { describe, it, expect } from "vitest";
import { consultar, apartarEnvio, type Apartado } from "./consulta";

const ahora = "2026-11-12T15:00:00Z";
const ap = (x: Partial<Apartado>): Apartado => ({ proveedorId: "exotic", agente: "revision6h", motivo: "borrador", desde: "2026-11-12T10:00:00Z", hasta: "2026-11-13T10:00:00Z", ...x });

describe("REQ-3430: consulta mutua antes de enviar", () => {
  it("REQ-3430: sin nada vivo de la otra, puede enviar", () => {
    expect(consultar([], "mila", "exotic", ahora)).toEqual({ ok: true });
    expect(consultar([ap({ hasta: "2026-11-12T14:00:00Z" })], "mila", "exotic", ahora)).toEqual({ ok: true }); // ya venció
    expect(consultar([ap({ proveedorId: "otro" })], "mila", "exotic", ahora)).toEqual({ ok: true }); // otro proveedor
  });
  it("REQ-3430: Mila espera si la revisión cada 6 h tiene un borrador vivo, y vuelve a consultar en 24 h", () => {
    expect(consultar([ap({})], "mila", "exotic", ahora)).toEqual({ ok: false, motivo: "la revisión cada 6 h tiene un borrador sin enviar", reintentar: "2026-11-13T15:00:00.000Z" });
  });
  it("REQ-3430: la revisión cada 6 h espera si Mila le escribió hace menos de 48 h", () => {
    const envio = apartarEnvio("mila", "exotic", "2026-11-11T09:00:00Z");
    expect(envio.hasta).toBe("2026-11-13T09:00:00.000Z");
    expect(consultar([envio], "revision6h", "exotic", ahora)).toMatchObject({ ok: false, motivo: "Mila le escribió o tiene un envío programado" });
  });
  it("REQ-3430: si las dos apartaron, gana la que apartó primero", () => {
    const lista = [ap({ agente: "revision6h", motivo: "negociacion", desde: "2026-11-12T11:00:00Z" }), ap({ agente: "mila", motivo: "envio", desde: "2026-11-12T10:30:00Z" })];
    expect(consultar(lista, "mila", "exotic", ahora)).toEqual({ ok: true });
    expect(consultar(lista, "revision6h", "exotic", ahora)).toMatchObject({ ok: false });
  });
  it("REQ-3430: si no pudo consultar, no envía (falla cerrado)", () => {
    expect(consultar(null, "mila", "exotic", ahora)).toEqual({ ok: false, motivo: "no se pudo consultar a la otra", reintentar: "2026-11-13T15:00:00.000Z" });
  });
});
