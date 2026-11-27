/**
 * REQ-10748 (ficha única, ola 3, decisión 13 = REQ-10592 firmada el 14-11-2026): lista antes/después de la
 * reclasificación de una agencia, para mostrarla al PO antes de aplicarla. Puro: sin red ni base.
 * - «antes»: cómo clasifica hoy el sitio un viaje de agencia: mapeo `propios` por `kind` (`card-format.ts`, `tripFormat`).
 * - «después»: con el mapeo firmado de la agencia (`AGENCY_MAPPINGS`) desde su denominación ORIGINAL (`originalOf`,
 *   REQ-753), misma regla que `lineageForTrip`: si no hay denominación original o la categoría es `por-revisar`,
 *   se queda como está y se anota la duda. Nunca se inventa una categoría.
 */
import { AGENCY_MAPPINGS, DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "../data";
import { originalOf } from "@/ingest/lib/originals";
import { classify } from "./classify";
import type { ClassifyInput } from "./types";

export interface EntradaAgencia {
  ref?: unknown;
  source?: unknown;
  original?: { categoria?: unknown } | null;
  trip: { kind?: unknown; titleEs?: unknown; titleEn?: unknown; summaryEs?: unknown; summaryEn?: unknown; priceFrom?: unknown; durationDays?: unknown };
}

export interface FilaReclasificacion {
  id: string;
  titulo: string;
  kind: string;
  original: string | null;
  antes: string;
  despues: string;
  cambia: boolean;
  temasAntes: string[];
  temasDespues: string[];
  duda: string | null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");

// REQ-10748
export function reclasificarAgencia(proveedor: string, entries: readonly EntradaAgencia[]): FilaReclasificacion[] {
  const agencia = AGENCY_MAPPINGS[proveedor];
  if (!agencia) throw new Error(`${proveedor}: sin mapeo de agencia`);
  const propios = DEFAULT_MAPPINGS.propios;
  const seen = new Map<string, number>();
  return entries.map((e) => {
    const t = e.trip;
    const base = str(e.ref) || "(sin ref)";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}#${n}`;
    const kind = str(t.kind);
    const input: ClassifyInput = {
      proveedor: "propios", categoriaId: kind, precio: num(t.priceFrom), durationDays: num(t.durationDays),
      titulo: `${str(t.titleEs)} | ${str(t.titleEn)}`, resumen: `${str(t.summaryEs)} ${str(t.summaryEn)}`.trim(),
    };
    const antes = classify(input, DEFAULT_DICTIONARY, { propios }, undefined);
    const original = originalOf(proveedor, e);
    const known = original ? agencia.categorias.find((c) => c.id === original.value && c.formato !== "por-revisar") : undefined;
    let despues = antes;
    let duda: string | null = null;
    if (!original) duda = "sin denominación original del proveedor: se queda como hoy";
    else if (!known) duda = `la categoría original «${original.value}» está por-revisar en el mapeo: se queda como hoy`;
    else {
      const merged = { propios, [agencia.proveedor]: { ...agencia, temasPorFuente: { ...(propios?.temasPorFuente ?? {}), ...(agencia.temasPorFuente ?? {}) } } };
      const r = classify({ ...input, proveedor: agencia.proveedor, categoriaId: original.value }, DEFAULT_DICTIONARY, merged, undefined);
      if (r.formato === "por-revisar") duda = `el mapeo de la agencia deja «${original.value}» por-revisar: se queda como hoy`;
      else despues = r;
    }
    return {
      id, titulo: str(t.titleEs) || str(t.titleEn), kind, original: original?.value ?? null,
      antes: antes.formato, despues: despues.formato, cambia: antes.formato !== despues.formato,
      temasAntes: antes.temas, temasDespues: despues.temas, duda,
    };
  });
}

export interface ResumenReclasificacion { viajes: number; cambian: number; igual: number; dudas: number; movimientos: Record<string, number> }

// REQ-10748
export function resumenReclasificacion(filas: readonly FilaReclasificacion[]): ResumenReclasificacion {
  const movimientos: Record<string, number> = {};
  for (const f of filas) if (f.cambia) movimientos[`${f.antes} → ${f.despues}`] = (movimientos[`${f.antes} → ${f.despues}`] ?? 0) + 1;
  return { viajes: filas.length, cambian: filas.filter((f) => f.cambia).length, igual: filas.filter((f) => !f.cambia).length, dudas: filas.filter((f) => f.duda).length, movimientos };
}
