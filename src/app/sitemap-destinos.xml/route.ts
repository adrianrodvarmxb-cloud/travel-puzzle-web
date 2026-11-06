/** REQ-102: hubs, países y ciudades indexables (tras PRIMERA_PIEZA_ENABLED). */
import { sitemapResponse } from '@/destinations/sitemaps';

export const dynamic = 'force-dynamic';

export function GET() {
    return sitemapResponse('sitemap-destinos.xml');
}
