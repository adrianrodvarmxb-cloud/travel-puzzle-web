/**
 * REQ-570: interruptor de enriquecimiento indexable por proveedor (decisión del PO, 6 nov 2026). Puro.
 * Todo generador de ficha (tour o viaje) lo consulta antes de agregar contenido indexable nuevo: descripción
 * en el marcado, «En breve», tipo principal, etiquetas o keywords. Las correcciones técnicas del marcado que ya
 * existe (moneda, quitar reseñas de terceros) aplican a todos.
 * - FREETOUR C2: false hasta tener permiso escrito de FREETOUR.
 * - Cualquier otro proveedor (viajes propios, agencias, proveedores nuevos): true.
 * Para apagar a un proveedor nuevo basta con agregarlo aquí en false.
 */
export const PROVIDER_ENRICHMENT: Readonly<Record<string, boolean>> = Object.freeze({ freetour: false });

// REQ-570
export function indexableEnrichment(provider: string | null | undefined): boolean {
  const k = (provider ?? "").trim().toLowerCase();
  return PROVIDER_ENRICHMENT[k] ?? true;
}
