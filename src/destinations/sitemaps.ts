/**
 * REQ-102: respuesta de los sitemaps (route handlers). Tras PRIMERA_PIEZA_ENABLED: apagada = 404, como hoy.
 * Se calculan del árbol de destinos (caché de 5 min), así que se rehacen solos después de cada sync.
 */
import { buildSitemaps } from '@/seo/lib/sitemaps';
import { sitemapInput } from './lib/page-model';
import { getDestinations, getPublishedTripRows, primeraPiezaOn, siteUrl } from './server';
import { allTours } from './lib/catalog';
import { viajesSitemapTrips } from '@/seo/lib/sitemaps-viajes';
import { isKindVisible, visibilityFromEnv } from '@/trips/lib/visibility';
import { sitePagesSitemap } from '@/site/server';

const XML = { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' };
const notFound = () => new Response('Not found', { status: 404 });

// REQ-102 REQ-584
export async function sitemapResponse(file: string): Promise<Response> {
    if (!primeraPiezaOn()) return notFound();
    // REQ-276: si hay páginas institucionales o blog encendidos, el índice suma sitemap-paginas.xml.
    const extra = sitePagesSitemap().length ? [{ loc: `${siteUrl().replace(/\/+$/, '')}/sitemap-paginas.xml`, lastmod: null }] : [];
    const [tree, tripRows] = await Promise.all([getDestinations(), getPublishedTripRows()]);
    // REQ-584: viajes con ficha canónica en /viajes (los que no viven bajo /destinos), con su interruptor.
    const placed = new Set(tree.flatMap((c) => c.cities.flatMap((ci) => allTours(ci).filter((t) => t.kind === 'own').map((t) => t.id))));
    const vis = visibilityFromEnv(process.env as Record<string, string | undefined>);
    const trips = viajesSitemapTrips(tripRows, placed, (k) => isKindVisible(k, vis));
    const { index, files } = buildSitemaps({ ...sitemapInput(tree, siteUrl()), trips }, extra);
    const body = file === 'sitemap-index.xml' ? index : files[file];
    return body ? new Response(body, { headers: XML }) : notFound();
}
