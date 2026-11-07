/** REQ-1346: el total de tours de /tours (solo servidor: usa el índice del catálogo y el diccionario). */
import { queryCatalog, type CatalogEntry } from "@/catalog/lib/query";
import { formatDefs } from "@/taxonomy/lib/format-defs";
import { DEFAULT_DICTIONARY } from "@/taxonomy/data";

const TOURS_FORMATOS = formatDefs(DEFAULT_DICTIONARY).map((d) => d.slug);

/** REQ-1346: cuántos tours lista /tours sin filtros (el mismo `queryCatalog` que su encabezado). */
// REQ-1346
export function catalogExperiencesTotal(entries: CatalogEntry[], taxonomy: boolean): number {
  return queryCatalog(entries, { taxonomy, formatos: [], formatosTours: TOURS_FORMATOS }, { page: 1, limit: 1 }).total;
}
