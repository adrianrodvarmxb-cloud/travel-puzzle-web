/** REQ-584: fichas /viajes canónicas con lastmod real (tras PRIMERA_PIEZA_ENABLED, como los demás sitemaps). */
import { sitemapResponse } from '@/destinations/sitemaps';

export const dynamic = 'force-dynamic';

export function GET() {
    return sitemapResponse('sitemap-viajes.xml');
}
