/** REQ-276: páginas institucionales encendidas y artículos publicados del blog. Sin ninguna, 404. */
import { urlsetXml } from '@/seo/lib/sitemaps';
import { sitePagesSitemap } from '@/site/server';

export const dynamic = 'force-dynamic';

export function GET() {
    const urls = sitePagesSitemap();
    if (!urls.length) return new Response('Not found', { status: 404 });
    return new Response(urlsetXml(urls), { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
