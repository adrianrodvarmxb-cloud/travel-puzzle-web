// REQ-10693: bandeja de borradores programados (puro + orquestación con repo en memoria; sin D1 ni Resend reales).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { accionDelPO, dejarBorrador, enviarVencidos } from "./borradores";
import { aplicarAccion, avisoInterno, clasificar, enlaceBorrador, enviosManuales, modoBorradores, type Borrador } from "./lib/borradores";
import type { BorradoresRepo } from "./borrador-repo";
import type { Correo } from "./lib/correo";

function memoria() {
  const filas: Borrador[] = [];
  const repo: BorradoresRepo = {
    async crear(b, ahora) { const f: Borrador = { ...b, estado: "programado", mensajeId: null, nota: "", editadoPor: null, enviadoEn: null, createdAt: ahora, updatedAt: ahora }; filas.push(f); return f; },
    async porId(id) { return filas.find((f) => f.id === id) ?? null; },
    async porEstado(estados) { return filas.filter((f) => estados.includes(f.estado)); },
    async guardar(id, c) { Object.assign(filas.find((f) => f.id === id)!, c); },
  };
  return { repo, filas };
}
const CORREO: Correo = { from: "Mila · Travel Puzzle <comercial@travelpuzzle.com.mx>", to: ["r@tangol.com"], cc: ["claulet@travelpuzzle.com.mx", "adrianrodvar@travelpuzzle.com.mx"], subject: "Re: Travel Puzzle · Tangol", text: "Hola Hernán…", inReplyTo: "<h@x>" };
const HOY = "2026-11-09T15:00:00.000Z";

describe("REQ-10693: dejar el borrador y avisar al PO", () => {
  it("REQ-10693: guarda para, copias, asunto, texto e hilo con su hora; devuelve el enlace del panel; el aviso lleva hora CDMX, hora del proveedor y enlace; nada se envía", async () => {
    const m = memoria(); const avisos: [string, string][] = []; const enviados: Correo[] = [];
    let n = 0;
    const r = await dejarBorrador(CORREO, { proveedorId: "tangol", proveedor: "Tangol", tipo: "recordatorio", enviarEn: "2026-11-10T08:00:00.000Z", zonaHoraria: "America/Argentina/Buenos_Aires" },
      { repo: m.repo, enviar: async (c) => { enviados.push(c); return "x"; }, hoy: HOY, siteUrl: "https://travelpuzzle.com.mx/", nuevoId: () => `b${++n}`, avisarPO: async (a, t) => { avisos.push([a, t]); } });
    expect(r).toEqual({ id: "b1", enlace: "https://travelpuzzle.com.mx/admin/borradores#b1", enviarEn: "2026-11-10T08:00:00.000Z" });
    expect(m.filas[0]).toMatchObject({ proveedorId: "tangol", tipo: "recordatorio", para: ["r@tangol.com"], cc: CORREO.cc, asunto: CORREO.subject, texto: CORREO.text, inReplyTo: "<h@x>", estado: "programado" });
    expect(enviados).toEqual([]);
    expect(avisos[0][0]).toBe("Borrador programado a Tangol: Re: Travel Puzzle · Tangol");
    expect(avisos[0][1]).toBe("Mila dejó listo un recordatorio para Tangol: «Re: Travel Puzzle · Tangol».\nSale el martes, 10 de noviembre, 02:00 (CDMX) (martes, 10 de noviembre, 05:00 hora del proveedor) si no lo cancelas.\nVer, editar o cancelar: https://travelpuzzle.com.mx/admin/borradores#b1");
  });
  it("REQ-10693: si el aviso al PO falla, el borrador queda igual (el enlace está en el reporte)", async () => {
    const m = memoria();
    const r = await dejarBorrador(CORREO, { proveedorId: "t", proveedor: "T", tipo: "reintento", enviarEn: "2026-11-10T11:00:00.000Z" },
      { repo: m.repo, enviar: async () => "x", hoy: HOY, siteUrl: "https://s", nuevoId: () => "b9", avisarPO: async () => { throw new Error("sin red"); } });
    expect(r.id).toBe("b9");
    expect(m.filas[0].estado).toBe("programado");
  });
});

describe("REQ-10693: salida a su hora, cancelación y edición del PO", () => {
  async function tres() {
    const m = memoria(); let n = 0;
    const deps = { repo: m.repo, enviar: async () => "msg", hoy: HOY, siteUrl: "https://s", nuevoId: () => `b${++n}` };
    await dejarBorrador(CORREO, { proveedorId: "a", proveedor: "A", tipo: "recordatorio", enviarEn: "2026-11-09T15:00:00.000Z" }, deps); // b1: ya
    await dejarBorrador(CORREO, { proveedorId: "b", proveedor: "B", tipo: "recordatorio", enviarEn: "2026-11-09T15:00:00.000Z" }, deps); // b2: el PO lo cancela
    await dejarBorrador(CORREO, { proveedorId: "c", proveedor: "C", tipo: "recordatorio", enviarEn: "2026-11-10T11:00:00.000Z" }, deps); // b3: mañana
    return { m, deps };
  }
  it("REQ-10693: manda solo lo programado que llegó a su hora; lo cancelado no sale; lo de mañana espera", async () => {
    const { m, deps } = await tres();
    const enviados: Correo[] = [];
    expect(await accionDelPO("b2", { accion: "cancelar", motivo: "ya contestaron" }, deps)).toMatchObject({ ok: true, borrador: { estado: "cancelado", nota: "ya contestaron" } });
    const r = await enviarVencidos({ ...deps, enviar: async (c) => { enviados.push(c); return "re_1"; } }, "Mila · Travel Puzzle <comercial@travelpuzzle.com.mx>");
    expect(r).toEqual({ enviados: 1, vencidos: 0, errores: [], esperan: 1 });
    expect(enviados[0]).toMatchObject({ from: "Mila · Travel Puzzle <comercial@travelpuzzle.com.mx>", to: ["r@tangol.com"], cc: CORREO.cc, subject: CORREO.subject, inReplyTo: "<h@x>" });
    expect(m.filas.map((f) => f.estado)).toEqual(["enviado", "cancelado", "programado"]);
    expect(m.filas[0]).toMatchObject({ mensajeId: "re_1", enviadoEn: HOY });
  });
  it("REQ-10693: «enviar ahora» adelanta la hora; «editar» cambia asunto, texto u hora con validación; sobre uno enviado ya no se puede", async () => {
    const { m, deps } = await tres();
    expect(await accionDelPO("b3", { accion: "editar", texto: "Texto corregido", enviarEn: "2026-11-11T11:00:00.000Z" }, deps)).toMatchObject({ ok: true, borrador: { texto: "Texto corregido", enviarEn: "2026-11-11T11:00:00.000Z", editadoPor: "PO (panel)" } });
    expect(await accionDelPO("b3", { accion: "editar", texto: "   " }, deps)).toMatchObject({ ok: false, motivo: "texto vacío o muy largo" });
    expect(await accionDelPO("b3", { accion: "editar", enviarEn: "2026-10-01T00:00:00Z" }, deps)).toMatchObject({ ok: false });
    expect(await accionDelPO("b3", { accion: "enviar_ahora" }, deps)).toMatchObject({ ok: true, borrador: { enviarEn: HOY } });
    const r = await enviarVencidos(deps, "x");
    expect(r.enviados).toBe(3); // b1 y b2 (ya era su hora) y b3 (adelantado)
    expect(await accionDelPO("b1", { accion: "cancelar" }, deps)).toMatchObject({ ok: false, motivo: "el borrador ya está enviado" });
    expect(await accionDelPO("nada", { accion: "cancelar" }, deps)).toMatchObject({ ok: false, motivo: "no existe" });
    expect(m.filas.filter((f) => f.estado === "enviado")).toHaveLength(3);
  });
  it("REQ-10693: lo vencido hace más de 6 h no sale solo: se marca «vencido» con nota; un fallo de Resend queda en «error» sin tumbar a los demás", async () => {
    const { m, deps } = await tres();
    const tarde = { ...deps, hoy: "2026-11-10T00:00:00.000Z" }; // 9 h después de b1/b2; b3 aún no
    const r = await enviarVencidos({ ...tarde, enviar: async () => { throw new Error("Resend 500"); } }, "x");
    expect(r).toEqual({ enviados: 0, vencidos: 2, errores: [], esperan: 1 });
    expect(m.filas[0]).toMatchObject({ estado: "vencido" });
    const r2 = await enviarVencidos({ ...deps, hoy: "2026-11-10T11:05:00.000Z", enviar: async () => { throw new Error("Resend 500"); } }, "x");
    expect(r2).toEqual({ enviados: 0, vencidos: 0, errores: ["b3: Resend 500"], esperan: 0 });
    expect(m.filas[2]).toMatchObject({ estado: "error", nota: "Resend 500" });
  });
  it("REQ-10693: funciones puras: clasificar no muta, el enlace apunta al panel y aplicarAccion rechaza estados cerrados", () => {
    const b: Borrador = { id: "b", proveedorId: "p", tipo: "recordatorio", para: [], cc: [], asunto: "A", texto: "T", inReplyTo: null, enviarEn: "2026-11-09T14:00:00Z", estado: "programado", mensajeId: null, nota: "", editadoPor: null, enviadoEn: null, createdAt: HOY, updatedAt: HOY };
    const lista = [b, { ...b, id: "c", estado: "cancelado" as const }];
    expect(clasificar(lista, Date.parse(HOY)).enviar.map((x) => x.id)).toEqual(["b"]);
    expect(lista).toHaveLength(2);
    expect(enlaceBorrador("https://travelpuzzle.com.mx", "b 1")).toBe("https://travelpuzzle.com.mx/admin/borradores#b%201");
    expect(aplicarAccion({ ...b, estado: "vencido" }, { accion: "enviar_ahora" }, HOY)).toMatchObject({ ok: false });
    expect(avisoInterno(b, "P", "https://x").texto).toContain("https://x");
  });
});

describe("REQ-10693: bandera y migración 0034", () => {
  it("REQ-10693: PROVEEDORES_BORRADORES_ON existe en wrangler.jsonc (encendida en modo manual desde el 17-11-2026, REQ-10762) y la 0034 crea la tabla sin tocar otras", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"PROVEEDORES_BORRADORES_ON":\s*"(true|false)"/);
    const sql = readFileSync("migrations/0034_proveedor_borrador.sql", "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "ProveedorBorrador"/);
    expect(sql).not.toMatch(/ALTER TABLE|DROP/);
  });
});

// REQ-10762 (PO, 17-11-2026: «que sean b solo 3 envios y despues ya se activa»): modo manual. El cron no manda nada ni marca
// vencidos; solo sale lo que el PO manda con «Enviar ya» (ese borrador y nada más). Tras 3 envíos manuales, pasa a «auto».
describe("REQ-10762: modo manual de la bandeja", () => {
  async function tres() {
    const m = memoria(); let n = 0;
    const deps = { repo: m.repo, enviar: async () => "msg", hoy: HOY, siteUrl: "https://s", nuevoId: () => `b${++n}` };
    await dejarBorrador(CORREO, { proveedorId: "a", proveedor: "A", tipo: "recordatorio", enviarEn: "2026-11-09T15:00:00.000Z" }, deps);
    await dejarBorrador(CORREO, { proveedorId: "b", proveedor: "B", tipo: "recordatorio", enviarEn: "2026-11-09T05:00:00.000Z" }, deps); // venció hace 10 h
    await dejarBorrador(CORREO, { proveedorId: "c", proveedor: "C", tipo: "recordatorio", enviarEn: "2026-11-10T11:00:00.000Z" }, deps);
    return { m, deps };
  }
  it("REQ-10762: en modo manual el cron no manda nada ni marca vencidos: todo sigue «programado» esperando al PO", async () => {
    const { m, deps } = await tres();
    const enviados: Correo[] = [];
    const r = await enviarVencidos({ ...deps, modo: "manual", enviar: async (c) => { enviados.push(c); return "x"; } }, "Mila <m@x>");
    expect(enviados).toEqual([]);
    expect(r).toEqual({ enviados: 0, vencidos: 0, errores: [], esperan: 3 });
    expect(m.filas.map((f) => f.estado)).toEqual(["programado", "programado", "programado"]);
  });
  it("REQ-10762: «Enviar ya» del PO en modo manual manda solo ese borrador, aunque otros ya estén a su hora", async () => {
    const { m, deps } = await tres();
    const enviados: Correo[] = [];
    expect(await accionDelPO("b2", { accion: "enviar_ahora" }, deps)).toMatchObject({ ok: true });
    const r = await enviarVencidos({ ...deps, modo: "manual", soloId: "b2", enviar: async (c) => { enviados.push(c); return "re_2"; } }, "Mila <m@x>");
    expect(enviados).toHaveLength(1);
    expect(r).toMatchObject({ enviados: 1, vencidos: 0, errores: [] });
    expect(m.filas.map((f) => f.estado)).toEqual(["programado", "enviado", "programado"]);
    expect(m.filas[1]).toMatchObject({ mensajeId: "re_2", editadoPor: "PO (panel)" });
  });
  it("REQ-10762: el aviso al PO en modo manual dice que no sale hasta que lo mande; en auto, la hora", () => {
    const b = { tipo: "recordatorio", asunto: "Tarifas 2027", enviarEn: "2026-11-10T11:00:00.000Z" };
    expect(avisoInterno(b, "Tangol", "https://s/admin/borradores#b1", undefined, "manual").texto).toMatch(/no sale hasta que lo mandes/i);
    expect(avisoInterno(b, "Tangol", "https://s/admin/borradores#b1", undefined, "manual").texto).not.toMatch(/si no lo cancelas/);
    expect(avisoInterno(b, "Tangol", "https://s/admin/borradores#b1").texto).toMatch(/si no lo cancelas/);
  });
  it("REQ-10762 / REQ-10812: la bandera de modo viene de wrangler.jsonc: PROVEEDORES_BORRADORES_ON encendida y MODO «auto» tras el tercer envío manual del PO; sin MODO se asume manual", () => {
    const w = readFileSync("wrangler.jsonc", "utf8");
    expect(w).toMatch(/"PROVEEDORES_BORRADORES_ON": "true"/);
    expect(w).toMatch(/"PROVEEDORES_BORRADORES_MODO": "auto"/); // REQ-10812
    expect(modoBorradores({})).toBe("manual");
    expect(modoBorradores({ PROVEEDORES_BORRADORES_MODO: "auto" })).toBe("auto");
    expect(modoBorradores({ PROVEEDORES_BORRADORES_MODO: "AUTO" })).toBe("manual");
  });
  it("REQ-10762: enviosManuales cuenta los que mandó el PO desde el panel (para pasar a auto después de 3)", () => {
    const f = (estado: Borrador["estado"], editadoPor: string | null) => ({ estado, editadoPor }) as Borrador;
    expect(enviosManuales([f("enviado", "PO (panel)"), f("enviado", null), f("cancelado", "PO (panel)"), f("enviado", "PO (panel)")])).toBe(2);
  });
});
