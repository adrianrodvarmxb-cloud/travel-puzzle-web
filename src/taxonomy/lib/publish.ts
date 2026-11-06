/**
 * T3: qué se publica según la taxonomía, tras TAXONOMY_PUBLISH_ENABLED (apagada). Puro.
 * - REQ-406: Free tour = formato `pieza-libre` (precio 0 salvo las 10 categorías que ganan antes).
 * - REQ-407 / REQ-408: `fuera` (online, servicios) y `por-revisar` no salen en /destinos, /la-primera-pieza, sitemaps,
 *   el inicio ni la venta cruzada, y no cuentan para indexar una ciudad (G-T10 = A).
 * - REQ-261: lo de la sección «traslados» (traslados y transporte de FREETOUR) sale de «Tours» y va a Traslados.
 * El clasificador corre en memoria con los datos de la fila (categoría, precio, duración, título): da el mismo formato
 * que el recálculo de T2b y no depende de que la migración 0017 esté aplicada.
 */
import type { Dictionary, Mapping } from "../schemas/dictionary";
import { classify } from "./classify";
import { DEFAULT_GATES, porRevisarVisibleEn, type Gates } from "./gates";
import type { FormatoOEstado, Seccion } from "./types";

/** Solo "true" exacto la enciende. */
export function taxonomyPublishEnabled(env: { TAXONOMY_PUBLISH_ENABLED?: string }): boolean {
  return env.TAXONOMY_PUBLISH_ENABLED === "true";
}

export interface CatalogTour { categoryId?: number | null; price: number | null; durationMinutes?: number | null; title: string }
export interface CatalogClass { formato: FormatoOEstado; seccion: Seccion }
export type CatalogClassifier = (t: CatalogTour) => CatalogClass;

/** Clasificador de filas de FREETOUR del catálogo (sin categoría = por-revisar: falla cerrada). */
export function catalogClassifier(dict: Dictionary, mappings: Record<string, Mapping>, gates: Gates = DEFAULT_GATES): CatalogClassifier {
  const memo = new WeakMap<CatalogTour, CatalogClass>();
  return (t) => {
    const hit = memo.get(t);
    if (hit) return hit;
    const r = classify({ proveedor: "freetour", categoriaId: t.categoryId ?? null, precio: t.price, durationMinutes: t.durationMinutes ?? null, titulo: t.title }, dict, mappings, gates);
    const out: CatalogClass = { formato: r.formato, seccion: r.seccion };
    memo.set(t, out);
    return out;
  };
}

/** ¿Sale en las páginas públicas (y cuenta para indexar)? `fuera` nunca; `por-revisar` según G-T10. */
export function isPublishable(formato: FormatoOEstado, where: "/destinos" | "/tours" = "/destinos", gate: Gates["porRevisar"] = DEFAULT_GATES.porRevisar): boolean {
  if (formato === "fuera") return false;
  if (formato === "por-revisar") return porRevisarVisibleEn(gate).includes(where);
  return true;
}

/** Formatos presenciales que puede sugerir la venta cruzada de las fichas (docs/taxonomia.md §8 #14). */
export const FORMATOS_PRESENCIALES: readonly FormatoOEstado[] = ["pieza-libre", "caminata", "tour", "excursion-dia", "experiencia-unica"];
