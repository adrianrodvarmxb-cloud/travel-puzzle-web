/** REQ-102: sitemap-index.xml → sitemap-destinos.xml y sitemap-tours-{pais}.xml (tras PRIMERA_PIEZA_ENABLED). */
import { sitemapResponse } from '@/destinations/sitemaps';

export const dynamic = 'force-dynamic';

export function GET() {
    return sitemapResponse('sitemap-index.xml');
}
