/**
 * REQ-3467: red de seguridad de la cobertura de la taxonomía. Un proveedor nuevo sin mapeo deja TODOS sus tours en
 * «por-revisar» (fuera de los filtros, del carrito por tipo y del inicio) sin que nadie se dé cuenta: esto lo
 * convierte en una prueba que falla y en un reporte que se puede imprimir.
 *
 * Puro: recibe los proveedores, las filas y los mapeos por parámetro (DIP). No lee la base ni el entorno.
 */
import type { Mapping } from "../schemas/dictionary";
import { findCategoria } from "./format";

/** Lo mínimo que se necesita de una fila del catálogo (una de `Tour`, un viaje propio o un registro del proveedor). */
export interface FilaCatalogo {
  proveedor: string;
  categoriaId: string | number | null;
}

/** Proveedores que pondrían tours en el catálogo y no tienen mapeo registrado. Sin repetidos y en orden alfabético. */
// REQ-3467
export function proveedoresSinMapeo(proveedores: Iterable<string>, mapeos: Record<string, Mapping>): string[] {
  const faltan = new Set<string>();
  for (const p of proveedores) if (!mapeos[p]) faltan.add(p);
  return [...faltan].sort();
}

/**
 * ¿Esta fila caería en «por-revisar»? Misma condición que `classifyFormato`: sin mapeo del proveedor, sin categoría,
 * con una categoría que no está en el mapeo o con una categoría cuyo formato base es `por-revisar` (históricas).
 */
// REQ-3467
export function caeEnPorRevisar(fila: FilaCatalogo, mapeos: Record<string, Mapping>): boolean {
  const mapping = mapeos[fila.proveedor];
  if (!mapping) return true;
  const cat = findCategoria(mapping, fila.categoriaId);
  return !cat || cat.formato === "por-revisar";
}

export interface ReporteCobertura {
  total: number;
  porRevisar: number;
  /** Proveedores de las filas que no tienen mapeo. */
  sinMapeo: string[];
  /** Cuántos tours por `proveedor:categoría`, solo los que caerían en «por-revisar», de más a menos. */
  detalle: { clave: string; tours: number }[];
}

/** Cuántos tours quedarían en «por-revisar» y de qué proveedor y categoría son. */
// REQ-3467
export function reporteCobertura(filas: readonly FilaCatalogo[], mapeos: Record<string, Mapping>): ReporteCobertura {
  const cuenta = new Map<string, number>();
  let porRevisar = 0;
  for (const f of filas) {
    if (!caeEnPorRevisar(f, mapeos)) continue;
    porRevisar++;
    const clave = `${f.proveedor}:${f.categoriaId ?? "sin categoría"}`;
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
  }
  const detalle = [...cuenta].map(([clave, tours]) => ({ clave, tours })).sort((a, b) => b.tours - a.tours || a.clave.localeCompare(b.clave));
  return {
    total: filas.length,
    porRevisar,
    sinMapeo: proveedoresSinMapeo(filas.map((f) => f.proveedor), mapeos),
    detalle,
  };
}

/** El reporte en una línea por dato, para imprimirlo en el sync o en una corrida a mano. */
// REQ-3467
export function textoCobertura(r: ReporteCobertura): string {
  const lineas = [`Taxonomía: ${r.porRevisar} de ${r.total} tours quedarían en «por-revisar».`];
  if (r.sinMapeo.length) lineas.push(`Proveedores sin mapeo: ${r.sinMapeo.join(", ")} (agrega src/taxonomy/data/mapping/<proveedor>.json y regístralo en src/taxonomy/data/index.ts).`);
  for (const d of r.detalle) lineas.push(`  ${d.clave}: ${d.tours}`);
  return lineas.join("\n");
}
