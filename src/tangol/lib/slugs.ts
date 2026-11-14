/**
 * REQ-10509: slugs de los tours de Tangol que no tienen (misma regla que Freetour, REQ-086: se conserva el guardado,
 * se genera desde el título y se desempata con sufijo; acotado al proveedor, REQ-3461). Puro.
 */
import { assignTourSlugs, type ExistingTour } from "@/destinations/lib/assign-slugs";
import { slugStatements } from "@/catalog/lib/sql";

export const TANGOL_PROVIDER = "tangol";

export interface TourSinSlug { id: string; externalId: number; titleEs: string | null; titleEn: string | null }
export interface SlugFaltante { externalId: number; slug: string; sql: string; params: unknown[] }

// REQ-10509
export function slugsFaltantes(existentes: readonly ExistingTour[], sinSlug: readonly TourSinSlug[]): SlugFaltante[] {
  const incoming = sinSlug.map((t) => ({ providerId: TANGOL_PROVIDER, externalId: t.externalId, id: t.id, title: (t.titleEs?.trim() || t.titleEn?.trim() || "") }));
  const porClave = new Map(sinSlug.map((t) => [`${TANGOL_PROVIDER}:${t.externalId}`, t.externalId]));
  const nuevos = assignTourSlugs(existentes, incoming).flatMap((a) => (a.slug && a.source !== "kept" ? [{ externalId: porClave.get(a.key)!, slug: a.slug }] : []));
  return nuevos.map((n) => ({ ...n, ...slugStatements([n], TANGOL_PROVIDER)[0] }));
}
