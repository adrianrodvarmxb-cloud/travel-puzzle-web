// Puro · REQ-3355, REQ-3520, REQ-3521: condiciones de cada proveedor (cancelación, cambios, pagos, operación) que se
// cargan desde el anexo a las columnas de la 0030. Regla firmada REQ-3358: nunca netos, márgenes, comisiones ni
// teléfonos del operador o del guía; FREETOUR nunca entra (bloqueado). Nada aquí escribe en la base: arma el SQL.
import { z } from "zod";

export const CAMPOS_CONDICIONES = ["cancelacion", "cambios", "pagos", "operacion"] as const;
export type CampoCondicion = (typeof CAMPOS_CONDICIONES)[number];

const texto = z.string().trim().max(2000);
export const CondicionesSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  cancelacion: texto,
  cambios: texto,
  pagos: texto,
  operacion: texto,
  fuente: z.string().trim().min(1).max(300), // acuerdo firmado, página de términos de la plataforma…
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();
export type Condiciones = z.infer<typeof CondicionesSchema>;

// REQ-3358: palabras que delatan netos, márgenes o comisiones.
const PROHIBIDO = /\b(netos?|tarifa neta|m[aá]rgen(es)?|markup|comisi[oó]n(es)?|utilidad)\b/i;
// Teléfonos: secuencias de 8 o más dígitos con espacios, guiones, paréntesis o +.
const TELEFONO = /\+?\(?\d[\d\s().-]{6,}\d/g;
const tieneTelefono = (s: string) => (s.match(TELEFONO) ?? []).some((m) => m.replace(/\D/g, "").length >= 8);

export type Revision = { ok: true; condiciones: Condiciones } | { ok: false; id: string; motivo: string };

// REQ-3355: valida un renglón antes de cargarlo.
export function revisarCondiciones(entrada: unknown): Revision {
  const r = CondicionesSchema.safeParse(entrada);
  const id = String((entrada as { id?: unknown })?.id ?? "?");
  if (!r.success) return { ok: false, id, motivo: "formato inválido" };
  if (r.data.id === "freetour") return { ok: false, id, motivo: "proveedor bloqueado" };
  if (CAMPOS_CONDICIONES.every((c) => !r.data[c])) return { ok: false, id, motivo: "sin condiciones" };
  for (const c of CAMPOS_CONDICIONES) {
    if (PROHIBIDO.test(r.data[c])) return { ok: false, id, motivo: `${c}: menciona netos, márgenes o comisiones` };
    if (tieneTelefono(r.data[c])) return { ok: false, id, motivo: `${c}: trae un teléfono` };
  }
  return { ok: true, condiciones: r.data };
}

const q = (s: string | null) => (s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`);

// REQ-3521: SQL de la carga (solo UPDATE de proveedores que existen y no están bloqueados). Lo aplica el PO (candado).
export function sqlCondiciones(lista: unknown[], ahora: string): { sql: string; cargados: string[]; rechazados: { id: string; motivo: string }[] } {
  const cargados: string[] = [];
  const rechazados: { id: string; motivo: string }[] = [];
  const lineas: string[] = [];
  for (const e of lista) {
    const r = revisarCondiciones(e);
    if (!r.ok) { rechazados.push({ id: r.id, motivo: r.motivo }); continue; }
    const c = r.condiciones;
    cargados.push(c.id);
    lineas.push(
      `UPDATE "Proveedor" SET "cancelacion"=${q(c.cancelacion)}, "cambios"=${q(c.cambios)}, "pagos"=${q(c.pagos)}, "operacion"=${q(c.operacion)}, ` +
      `"condicionesFuente"=${q(c.fuente)}, "condicionesFecha"=${q(c.fecha)}, "updatedAt"=${q(ahora)} WHERE "id"=${q(c.id)} AND "bloqueado"=0;`,
    );
  }
  return { sql: lineas.join("\n"), cargados, rechazados };
}
