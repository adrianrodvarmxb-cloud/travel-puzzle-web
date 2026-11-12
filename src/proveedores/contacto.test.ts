// REQ-3430: acceso protegido de la revisión cada 6 h a la lista compartida (consultar, apartar y liberar) y su repositorio en D1.
import { describe, it, expect } from "vitest";
import { atenderContacto } from "./contacto";
import { createContactoRepo } from "./contacto-repo";
import type { Apartado } from "./lib/consulta";
import { readFileSync } from "node:fs";

const ahora = "2026-11-12T15:00:00Z";
function memoria(inicial: Apartado[] = []) {
  const lista = [...inicial];
  return { lista, repo: { listar: async (id: string) => lista.filter((a) => a.proveedorId === id), apartar: async (a: Apartado) => { lista.push(a); },
    liberar: async (id: string, agente: string, hasta: string) => { for (const a of lista) if (a.proveedorId === id && a.agente === agente && a.hasta > hasta) a.hasta = hasta; } } };
}
const pedir = (m: ReturnType<typeof memoria>, x: { token?: string; secreto?: string; encendido?: boolean; metodo?: "GET" | "POST"; proveedor?: string; cuerpo?: unknown }) =>
  atenderContacto({ autorizacion: `Bearer ${x.token ?? "s3"}`, metodo: x.metodo ?? "GET", proveedor: x.proveedor ?? "exotic", cuerpo: x.cuerpo },
    { repo: m.repo, ahora, secreto: x.secreto ?? "s3", encendido: x.encendido ?? true });

describe("REQ-3430: acceso de la revisión cada 6 h a la lista compartida", () => {
  it("REQ-3430: sin secreto correcto responde 401 y con la bandera apagada no hace nada", async () => {
    const m = memoria();
    expect((await pedir(m, { token: "malo" })).status).toBe(401);
    expect((await pedir(m, { secreto: "" , token: "" })).status).toBe(401);
    expect(await pedir(m, { encendido: false })).toEqual({ status: 200, cuerpo: { ok: false, motivo: "proveedores_off" } });
  });
  it("REQ-3430: consultar dice si puede escribir y por qué no", async () => {
    const m = memoria([{ proveedorId: "exotic", agente: "mila", motivo: "envio", desde: "2026-11-12T09:00:00Z", hasta: "2026-11-14T09:00:00Z" }]);
    expect(await pedir(m, {})).toEqual({ status: 200, cuerpo: { ok: false, motivo: "Mila le escribió o tiene un envío programado", reintentar: "2026-11-13T15:00:00.000Z" } });
  });
  it("REQ-3430: apartar solo si puede; si Mila tiene algo vivo responde 409", async () => {
    const m = memoria();
    expect(await pedir(m, { metodo: "POST", cuerpo: { accion: "apartar", motivo: "borrador", horas: 24 } })).toEqual({ status: 200, cuerpo: { ok: true } });
    expect(m.lista[0]).toEqual({ proveedorId: "exotic", agente: "revision6h", motivo: "borrador", desde: ahora, hasta: "2026-11-13T15:00:00.000Z" });
    const ocupado = memoria([{ proveedorId: "exotic", agente: "mila", motivo: "envio", desde: "2026-11-12T09:00:00Z", hasta: "2026-11-14T09:00:00Z" }]);
    expect((await pedir(ocupado, { metodo: "POST", cuerpo: { accion: "apartar", motivo: "negociacion", horas: 72 } })).status).toBe(409);
  });
  it("REQ-3430: liberar cierra lo vivo de la revisión cada 6 h; un cuerpo inválido responde 400", async () => {
    const m = memoria([{ proveedorId: "exotic", agente: "revision6h", motivo: "borrador", desde: "2026-11-12T09:00:00Z", hasta: "2026-11-14T09:00:00Z" }]);
    expect(await pedir(m, { metodo: "POST", cuerpo: { accion: "liberar" } })).toEqual({ status: 200, cuerpo: { ok: true } });
    expect(m.lista[0].hasta).toBe(ahora);
    expect((await pedir(m, { metodo: "POST", cuerpo: { accion: "apartar", motivo: "envio", horas: 24 } })).status).toBe(400); // «envio» es solo de Mila
    expect((await pedir(m, { metodo: "POST", cuerpo: { accion: "apartar", motivo: "borrador", horas: 9999 } })).status).toBe(400);
  });
});

describe("REQ-3430: repositorio y migración de la lista compartida", () => {
  it("REQ-3430: el repositorio lee y escribe en ProveedorContacto", async () => {
    const llamadas: string[] = [];
    const repo = createContactoRepo({ all: async (sql) => { llamadas.push(sql); return []; }, run: async (sql) => { llamadas.push(sql); } });
    await repo.listar("exotic");
    await repo.apartar({ proveedorId: "exotic", agente: "mila", motivo: "envio", desde: ahora, hasta: ahora });
    await repo.liberar("exotic", "revision6h", ahora);
    expect(llamadas.every((s) => s.includes('"ProveedorContacto"'))).toBe(true);
  });
  it("REQ-3430: la migración de proveedores crea la tabla ProveedorContacto", () => {
    expect(readFileSync("migrations/0027_proveedores_mila.sql", "utf8")).toMatch(/CREATE TABLE IF NOT EXISTS "ProveedorContacto"/);
  });
});
