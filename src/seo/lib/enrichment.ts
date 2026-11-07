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

/**
 * REQ-830: «noindex hasta su permiso» (decisión del PO, 6 nov 2026, 22:36). Puro.
 * Las fichas de un proveedor en false llevan `robots: noindex, follow` y salen de los sitemaps; sus tarjetas y
 * enlaces internos siguen, y la regla de indexación de la ciudad (REQ-089/REQ-407) no cambia.
 * - FREETOUR: false hasta tener el permiso escrito (guardarlo en docs/freetour/autorizaciones.md).
 *   Para revertir: quitar `freetour: false` de esta tabla (y su prueba REQ-830).
 * REQ-1200…1205: la misma tabla decide qué tours cuentan para indexar una ciudad (y en cascada su país, sitemaps,
 * hreflang e IndexNow). Quitar `freetour: false` revierte todo en un solo cambio.
 */
export const PROVIDER_INDEXABLE: Readonly<Record<string, boolean>> = Object.freeze({ freetour: false });

// REQ-830
export function indexableProvider(provider: string | null | undefined): boolean {
  const k = (provider ?? "").trim().toLowerCase();
  return PROVIDER_INDEXABLE[k] ?? true;
}

// REQ-830: robots de la ficha según el proveedor (null = lo decide la página, como hoy).
export function providerRobots(provider: string | null | undefined): { index: false; follow: true } | null {
  return indexableProvider(provider) ? null : { index: false, follow: true };
}

// REQ-1203: proveedores sin permiso de indexar (para contar en SQL los tours indexables de una ciudad).
export function nonIndexableProviders(): string[] {
  return Object.keys(PROVIDER_INDEXABLE).filter((k) => PROVIDER_INDEXABLE[k] === false);
}
