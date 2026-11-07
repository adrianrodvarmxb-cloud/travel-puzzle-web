/**
 * Dependencias reales de las páginas de /destinos (D1 de la petición y caché compartida).
 * Solo para server components y route handlers; el middleware usa edge.ts con su propio D1.
 */
import { getD1 } from "@/lib/prisma";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { withRetry } from "@/tours/lib/d1-load";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";
import { visibilityFromEnv } from "@/trips/lib/visibility";
import { destinationsRepo, loadTree, SITE_URL_DEFAULT } from "./load";
import { taxonomyPublishEnabled } from "@/taxonomy/lib/publish";
import type { D1Read, TourPlaceRow } from "./repository";
import type { CountryNode } from "./lib/catalog";

export const primeraPiezaOn = () => isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED);
export const siteUrl = () => process.env.SITE_URL || SITE_URL_DEFAULT;

/** Árbol de destinos de la petición. Caché de 5 min (el sync escribe una vez al día). */
export function getDestinations(): Promise<CountryNode[]> {
  const vis = visibilityFromEnv(process.env as Record<string, string | undefined>);
  const taxonomy = taxonomyPublishEnabled(process.env as Record<string, string | undefined>);
  return cached(cacheKey("destinos", { v: "3" /* REQ-520; REQ-532…537 formato recalculado */, own: String(vis.own), transport: String(vis.transport), tax: String(taxonomy) }), POLICY.toursList, () =>
    withRetry(() => loadTree(destinationsRepo(getD1() as unknown as D1Read), new Date(), vis, { taxonomy }))
  );
}

/** REQ-092: el tour de la página 410, leído de D1 por id. Si la base falla, null (la página usa su texto fijo). */
export async function getGonePlace(id: string): Promise<TourPlaceRow | null> {
  if (!id || id.length > 64) return null;
  try {
    return await withRetry(() => destinationsRepo(getD1() as unknown as D1Read).tourPlaceById(id));
  } catch (error) {
    console.error("[destinos] tour retirado sin datos:", (error as Error).message);
    return null;
  }
}

/** REQ-584: viajes publicados (para sitemap-viajes.xml). Caché como el árbol; si D1 falla, lista vacía (el sitemap sigue). */
export async function getPublishedTripRows() {
  try {
    return await cached(cacheKey("viajes-sitemap", { v: "1" }), POLICY.toursList, () =>
      withRetry(() => destinationsRepo(getD1() as unknown as D1Read).trips()));
  } catch (error) {
    console.error("[sitemap] viajes sin datos:", (error as Error).message);
    return [];
  }
}
