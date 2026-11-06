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
import type { D1Read } from "./repository";
import type { CountryNode } from "./lib/catalog";

export const primeraPiezaOn = () => isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED);
export const siteUrl = () => process.env.SITE_URL || SITE_URL_DEFAULT;

/** Árbol de destinos de la petición. Caché de 5 min (el sync escribe una vez al día). */
export function getDestinations(): Promise<CountryNode[]> {
  const vis = visibilityFromEnv(process.env as Record<string, string | undefined>);
  return cached(cacheKey("destinos", { v: "1", own: String(vis.own), transport: String(vis.transport) }), POLICY.toursList, () =>
    withRetry(() => loadTree(destinationsRepo(getD1() as unknown as D1Read), new Date(), vis))
  );
}
