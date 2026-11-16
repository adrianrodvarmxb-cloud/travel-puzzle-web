/**
 * REQ-10729 (ficha única, decisión 14, REQ-10593: «guardarla completa, sin mostrarla»): la denominación original
 * que Tangol le da a un tour son DOS códigos, `TypeCode` y `SubTypeCode` (el par que mapea `src/tangol/lib/taxonomia.ts`).
 * Hasta la ola 3 el archivo (`ProviderRecord.originalCategory`, REQ-753) guardaba solo `TypeCode`; desde aquí guarda el par
 * tal cual llegó, separado por `|`. Puro: sin red, sin base, sin reloj.
 *
 * Compatibilidad: sin subtipo se sigue guardando `{ field: "TypeCode", value }`, así las filas viejas y las nuevas se
 * leen igual. Nada de esto se muestra en la ficha: es linaje para auditar la reclasificación (REQ-751).
 */
export interface OriginalTangol { field: string; value: string }

const text = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

// REQ-10729
export function originalDeTangol(r: Record<string, unknown>): OriginalTangol | null {
  const tipo = text(r.TypeCode);
  if (!tipo) return null;
  const subtipo = text(r.SubTypeCode);
  return subtipo ? { field: "TypeCode|SubTypeCode", value: `${tipo}|${subtipo}` } : { field: "TypeCode", value: tipo };
}
