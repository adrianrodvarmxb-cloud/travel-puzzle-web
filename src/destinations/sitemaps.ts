/**
 * REQ-102: respuesta de los sitemaps (route handlers). Tras PRIMERA_PIEZA_ENABLED: apagada = 404, como hoy.
 * Se calculan del árbol de destinos (caché de 5 min), así que se rehacen solos después de cada sync.
 */
import { buildSitemaps } from '@/seo/lib/sitemaps';
import { sitemapInput } from './lib/page-model';
import { getDestinations, primeraPiezaOn, siteUrl } from './server';
import { sitePagesSitemap } from '@/site/server';

const XML = { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' };
const notFound = () => new Response('Not found', { status: 404 });

// REQ-102
export async function sitemapResponse(file: string): Promise<Response> {
    if (!primeraPiezaOn()) return notFound();
    // REQ-276: si hay páginas institucionales o blog encendidos, el índice suma sitemap-paginas.xml.
    const extra = sitePagesSitemap().length ? [{ loc: `${siteUrl().replace(/\/+$/, '')}/sitemap-paginas.xml`, lastmod: null }] : [];
    const { index, files } = buildSitemaps(sitemapInput(await getDestinations(), siteUrl()), extra);
    const body = file === 'sitemap-index.xml' ? index : files[file];
    return body ? new Response(body, { headers: XML }) : notFound();
}

/** REQ-586: los archivos de sitemap que lista el índice, ya armados (para IndexNow). Apagada PRIMERA_PIEZA: ninguno. */
export async function sitemapFiles(): Promise<Record<string, string>> {
    const index = await sitemapResponse('sitemap-index.xml');
    if (!index.ok) return {};
    const names = [...(await index.text()).matchAll(/<loc>[^<]*\/([^/<]+\.xml)<\/loc>/g)].map((m) => m[1]);
    const out: Record<string, string> = {};
    for (const name of names) {
        const r = await sitemapResponse(name).catch(() => null);
        if (r?.ok) out[name] = await r.text();
    }
    return out;
}
