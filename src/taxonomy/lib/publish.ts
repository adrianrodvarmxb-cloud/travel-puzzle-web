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
import { TEMAS_FILTRO, atributosDeClase } from "./filters";

/** Solo "true" exacto la enciende. */
export function taxonomyPublishEnabled(env: { TAXONOMY_PUBLISH_ENABLED?: string }): boolean {
  return env.TAXONOMY_PUBLISH_ENABLED === "true";
}

export interface CatalogTour { categoryId?: number | null; price: number | null; durationMinutes?: number | null; title: string; /** REQ-1253 */ cities?: readonly string[]; /** REQ-1422: idiomas del guía (para «En español»). */ languages?: readonly string[] | null }
/** `guiaEnPersona`: el formato tiene guía en persona y el título no dice autoguiado o self-guided (decisión del PO, 6-11). */
export interface CatalogClass { formato: FormatoOEstado; seccion: Seccion; guiaEnPersona: boolean; /** REQ-544: atributos (chips de la ficha). */ atributos?: string[]; /** REQ-1421 */ temas?: string[] }
export type CatalogClassifier = (t: CatalogTour) => CatalogClass;

/** Clasificador de filas de FREETOUR del catálogo (sin categoría = por-revisar: falla cerrada). */
export function catalogClassifier(dict: Dictionary, mappings: Record<string, Mapping>, gates: Gates = DEFAULT_GATES): CatalogClassifier {
  const memo = new WeakMap<CatalogTour, CatalogClass>();
  return (t) => {
    const hit = memo.get(t);
    if (hit) return hit;
    const r = classify({ proveedor: "freetour", categoriaId: t.categoryId ?? null, precio: t.price, durationMinutes: t.durationMinutes ?? null, titulo: t.title, ciudades: t.cities, idiomas: t.languages ? [...t.languages] : undefined }, dict, mappings, gates);
    const term = dict.terminos.find((x) => x.eje === "formato" && x.slug === r.formato) as { guiaEnPersona?: boolean } | undefined;
    const out: CatalogClass = { formato: r.formato, seccion: r.seccion, guiaEnPersona: !!term?.guiaEnPersona && !r.atributos.includes("autoguiado"), atributos: r.atributos, temas: r.temas };
    memo.set(t, out);
    return out;
  };
}

/** REQ-1421 / REQ-1422: temas y atributos de un producto, ya en los valores del filtro de /tours. */
export function catalogFacets(c: CatalogClass): { temas: string[]; atributos: string[] } {
  return { temas: (c.temas ?? []).filter((t) => (TEMAS_FILTRO as readonly string[]).includes(t)), atributos: atributosDeClase(c.atributos) };
}

/** ¿Sale en las páginas públicas (y cuenta para indexar)? `fuera` nunca; `por-revisar` según G-T10. */
export function isPublishable(formato: FormatoOEstado, where: "/destinos" | "/tours" = "/destinos", gate: Gates["porRevisar"] = DEFAULT_GATES.porRevisar): boolean {
  if (formato === "fuera" || formato === "esenciales-viaje") return false; // REQ-1263: tras bandera
  // REQ-1262: «Experiencias en línea» tiene su sección en /tours, pero no es «cosas que hacer» en la ciudad ni cuenta para indexarla.
  if (formato === "en-linea") return where === "/tours";
  if (formato === "por-revisar") return porRevisarVisibleEn(gate).includes(where);
  return true;
}

/** Formatos presenciales que puede sugerir la venta cruzada de las fichas (docs/taxonomia.md §8 #14). */
export const FORMATOS_PRESENCIALES: readonly FormatoOEstado[] = ["pieza-libre", "caminata", "visita-guiada", "tour", "excursion-dia", "experiencia-unica"];

/** Formato de un viaje propio desde su kind (sin título ni días: el de la tarjeta de /destinos). */
export function ownKindFormato(kind: string | undefined): FormatoOEstado {
  return ({ circuito: "circuito", unica: "experiencia-unica", personalizado: "a-la-medida", transporte: "transporte" } as Record<string, FormatoOEstado>)[kind ?? ""] ?? "tour";
}
