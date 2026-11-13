/**
 * Catálogo de tipos de Tangol a partir de sus tours (REQ-3486). Puro: recibe los tours ya leídos.
 *
 * Para qué: el mapeo de taxonomía de Tangol (REQ-3465) usa hoy una categoría comodín porque nunca hemos
 * visto un valor real de `TypeCode`/`SubTypeCode`/`TourType`. Con este conteo se puede hacer el mapeo
 * categoría por categoría, como el de Freetour (petición del PO, 12 nov 2026).
 */

export interface TourTypeInput {
  typeCode?: string | null;
  subTypeCode?: string | null;
  tourType?: number | null;
  title?: string | null;
  destination?: string | null;
}

export interface TypeTally {
  typeCode: string;
  subTypeCode: string;
  tourType: string;
  tours: number;
  /** Hasta tres títulos de ejemplo, para poder decidir el formato de la taxonomía. */
  examples: string[];
}

const label = (v: unknown) => (v === null || v === undefined || v === "" ? "(vacío)" : String(v));

/** Cuenta los tipos distintos y guarda hasta tres títulos de ejemplo de cada uno. */
// REQ-3486
export function tallyTourTypes(tours: readonly TourTypeInput[], maxExamples = 3): TypeTally[] {
  const byKey = new Map<string, TypeTally>();
  for (const t of tours) {
    const typeCode = label(t.typeCode);
    const subTypeCode = label(t.subTypeCode);
    const tourType = label(t.tourType);
    const key = `${typeCode}|${subTypeCode}|${tourType}`;
    const row = byKey.get(key) ?? { typeCode, subTypeCode, tourType, tours: 0, examples: [] };
    row.tours++;
    const title = (t.title ?? "").trim();
    if (title && row.examples.length < maxExamples && !row.examples.includes(title)) row.examples.push(title);
    byKey.set(key, row);
  }
  return [...byKey.values()].sort((a, b) => b.tours - a.tours || a.typeCode.localeCompare(b.typeCode));
}

/** Tabla en markdown para pegar en el gate de taxonomía. No incluye precios ni nada del proveedor. */
// REQ-3486
export function formatTypeTally(rows: readonly TypeTally[], total: number): string {
  const out = [
    `Tipos distintos: ${rows.length} — tours leídos: ${total}`,
    "",
    "| TypeCode | SubTypeCode | TourType | Tours | Ejemplos |",
    "|---|---|---|---|---|",
  ];
  for (const r of rows) out.push(`| ${r.typeCode} | ${r.subTypeCode} | ${r.tourType} | ${r.tours} | ${r.examples.join(" · ") || "—"} |`);
  return out.join("\n");
}
