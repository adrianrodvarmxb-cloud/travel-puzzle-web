// REQ-10813 (plan REQ-3457 §3 y §8): carga inicial de las preguntas abiertas de los 7 proveedores publicados.
// npx vitest run src/proveedores/lib/preguntas-carga.test.ts
import { describe, it, expect } from "vitest";
import { PREGUNTAS_INICIALES, PUBLICADOS_G5, REVISIONES, motivoSinRevision, sinMontos, sqlCargaPreguntas, sqlRegresoPreguntas, resumenPreguntas, validarCarga, type RevisionCompleta } from "./preguntas-carga";
import { leerPreguntas, abiertas, textoRecordatorio } from "./preguntas";
import { DIRECTORIO_APROBADO } from "./directorio";

const HOY = "2026-11-21";

const REVISADO: RevisionCompleta = { fecha: "2026-11-21", hilos: 3, adjuntos: true, contrato: true, expediente: "proveedores/x-expediente.md", contestadas: 0 };

describe("REQ-10813: las preguntas iniciales son las de los 7 publicados (G5-A), sin montos ni datos fiscales", () => {
  it("REQ-10813: cubre exactamente a los 7 publicados del directorio (Tangol va por API, no por correo) y cada id existe en el directorio", () => {
    expect(Object.keys(PREGUNTAS_INICIALES).sort()).toEqual([...PUBLICADOS_G5].sort());
    const ids = new Set(DIRECTORIO_APROBADO.map((p) => p.id));
    for (const id of PUBLICADOS_G5) expect(ids.has(id), id).toBe(true);
    expect(PUBLICADOS_G5).not.toContain("tangol");
    expect(PUBLICADOS_G5).not.toContain("freetour");
  });
  it("REQ-10813: cada proveedor tiene entre 3 y 6 preguntas de venta (hasta 5 salen arriba) y al menos una de alta; ids únicos; es y en; `desde` y `req`", () => {
    for (const [id, lista] of Object.entries(PREGUNTAS_INICIALES)) {
      const venta = lista.filter((p) => p.tema !== "alta");
      expect(venta.length, id).toBeGreaterThanOrEqual(3);
      expect(venta.length, id).toBeLessThanOrEqual(6);
      expect(lista.some((p) => p.tema === "alta"), id).toBe(true);
      expect(new Set(lista.map((p) => p.id)).size, id).toBe(lista.length);
      for (const p of lista) {
        expect(p.id.startsWith(`${id}:`), p.id).toBe(true);
        expect(p.es.length, p.id).toBeGreaterThan(10);
        expect(p.en.length, p.id).toBeGreaterThan(10);
        expect(p.desde, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(p.cerrada, p.id).toBeNull();
        expect(p.req === null || /^REQ-\d+$/.test(p.req), p.id).toBe(true);
      }
    }
  });
  it("REQ-10813: ninguna pregunta trae montos, porcentajes, cuentas ni datos fiscales (`sinMontos`)", () => {
    for (const lista of Object.values(PREGUNTAS_INICIALES)) for (const p of lista) {
      expect(sinMontos(p.es), p.id).toBe(true);
      expect(sinMontos(p.en), p.id).toBe(true);
    }
    expect(sinMontos("La tarifa es de USD 1,200 por persona")).toBe(false);
    expect(sinMontos("comisión del 20 %")).toBe(false);
    expect(sinMontos("cuenta 0123456789")).toBe(false);
    expect(sinMontos("RFC de la empresa")).toBe(false);
    expect(sinMontos("¿Hay salidas del 18 al 30 de enero de 2027?")).toBe(true);
  });
  it("REQ-10813: lo que se carga lo lee `leerPreguntas` tal cual y el recordatorio sale con hasta 5 puntos arriba y el cierre abajo", () => {
    for (const [id, lista] of Object.entries(PREGUNTAS_INICIALES)) {
      const leidas = leerPreguntas(JSON.stringify(lista));
      expect(leidas, id).toHaveLength(lista.length);
      expect(abiertas(leidas), id).toHaveLength(lista.length);
      const rec = textoRecordatorio({ preguntas: leidas, idioma: "es", alta: [] });
      expect(rec.arriba.length, id).toBeGreaterThanOrEqual(1);
      expect(rec.arriba.length, id).toBeLessThanOrEqual(5);
      expect(rec.cierre.length, id).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("REQ-10813: SQL de carga con punto de regreso; simula por defecto", () => {
  it("REQ-10813: un UPDATE por proveedor, solo sobre `preguntas` y `updatedAt`, con el JSON escapado; nada más se toca", () => {
    const sql = sqlCargaPreguntas({ "destino-colombia": PREGUNTAS_INICIALES["destino-colombia"] }, HOY);
    const lineas = sql.trim().split("\n");
    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatch(/^UPDATE "Proveedor" SET "preguntas" = '\[.*\]', "updatedAt" = '2026-11-21T[^']*' WHERE "id" = 'destino-colombia' AND "publicado" = 1;$/);
    expect(lineas[0]).not.toMatch(/INSERT|DELETE|DROP/);
    const sqlTodos = sqlCargaPreguntas(PREGUNTAS_INICIALES, HOY);
    expect(sqlTodos.trim().split("\n")).toHaveLength(PUBLICADOS_G5.length);
  });
  it("REQ-10813: el regreso deja la columna en '[]' solo en esos proveedores (REQ-10649), y el respaldo previo es un SELECT de solo lectura", () => {
    const r = sqlRegresoPreguntas(["destino-colombia", "big-bus-tours"]);
    expect(r.respaldo).toBe(`SELECT "id", "preguntas" FROM "Proveedor" WHERE "id" IN ('destino-colombia', 'big-bus-tours');`);
    expect(r.regreso.trim().split("\n")).toEqual([
      `UPDATE "Proveedor" SET "preguntas" = '[]' WHERE "id" = 'destino-colombia';`,
      `UPDATE "Proveedor" SET "preguntas" = '[]' WHERE "id" = 'big-bus-tours';`,
    ]);
  });
  it("REQ-10813: `validarCarga` rechaza un proveedor que no está publicado en el directorio, una columna ya con preguntas (no se pisa) o un monto", () => {
    const base = { "destino-colombia": PREGUNTAS_INICIALES["destino-colombia"] };
    expect(validarCarga(base, DIRECTORIO_APROBADO, { "destino-colombia": "[]" }, { "destino-colombia": REVISADO })).toEqual([]);
    expect(validarCarga({ ...base, "kyoto-tours": PREGUNTAS_INICIALES["destino-colombia"] }, DIRECTORIO_APROBADO, {}, { "destino-colombia": REVISADO })).toContain("kyoto-tours: no está publicado en el directorio");
    expect(validarCarga(base, DIRECTORIO_APROBADO, { "destino-colombia": JSON.stringify(PREGUNTAS_INICIALES["destino-colombia"]) }, { "destino-colombia": REVISADO })).toContain("destino-colombia: ya tiene preguntas cargadas; no se pisan");
    const conMonto = { "destino-colombia": [{ ...PREGUNTAS_INICIALES["destino-colombia"][0], es: "¿La tarifa es USD 900?" }] };
    expect(validarCarga(conMonto, DIRECTORIO_APROBADO, {}, { "destino-colombia": REVISADO }).join(" ")).toMatch(/monto/);
  });
  it("REQ-10813: el resumen dice cuántas preguntas por proveedor y por tema, para el aviso al PO", () => {
    const r = resumenPreguntas(PREGUNTAS_INICIALES);
    expect(r.proveedores).toBe(7);
    expect(r.total).toBe(Object.values(PREGUNTAS_INICIALES).reduce((s, l) => s + l.length, 0));
    expect(r.porProveedor["big-bus-tours"]).toBeGreaterThan(0);
    expect(Object.keys(r.porTema).sort()).toEqual(["alta", "calendario", "cancelacion", "pago", "tarifas"].filter((t) => r.porTema[t as keyof typeof r.porTema] !== undefined).sort());
  });
});

describe("REQ-10850: ninguna pregunta a un proveedor sin revisión completa", () => {
  it("REQ-10850: hoy ningún proveedor tiene revisión registrada, así que no se puede cargar ninguno", () => {
    for (const id of PUBLICADOS_G5) expect(REVISIONES[id]).toBeNull();
    const motivos = validarCarga(PREGUNTAS_INICIALES, DIRECTORIO_APROBADO, {});
    for (const id of PUBLICADOS_G5) expect(motivos).toContain(`${id}: sin revisión completa de hilos, adjuntos, contrato y expediente (REQ-10850)`);
  });

  it("REQ-10850: una revisión sin contrato, sin adjuntos o sin hilos leídos no cuenta", () => {
    expect(motivoSinRevision("x", { ...REVISADO, contrato: false })).toMatch(/falta contrato/);
    expect(motivoSinRevision("x", { ...REVISADO, adjuntos: false, hilos: 0 })).toMatch(/falta hilos, adjuntos/);
    expect(motivoSinRevision("x", { ...REVISADO, expediente: "" })).toMatch(/falta expediente/);
    expect(motivoSinRevision("x", REVISADO)).toBeNull();
  });

  it("REQ-10850: con la revisión completa de un proveedor, solo ese proveedor se puede cargar", () => {
    const m = validarCarga({ "destino-colombia": PREGUNTAS_INICIALES["destino-colombia"], "extime-travel": PREGUNTAS_INICIALES["extime-travel"] }, DIRECTORIO_APROBADO, {}, { "destino-colombia": REVISADO });
    expect(m.some((x) => x.startsWith("destino-colombia"))).toBe(false);
    expect(m).toContain("extime-travel: sin revisión completa de hilos, adjuntos, contrato y expediente (REQ-10850)");
  });
});
