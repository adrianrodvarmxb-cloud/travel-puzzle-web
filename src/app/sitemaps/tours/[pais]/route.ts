/**
 * REQ-102: fichas de un país. Se publica como /sitemap-tours-{pais}.xml: el middleware reescribe esa URL aquí
 * (Next no permite un segmento dinámico a media palabra en el nombre de la carpeta).
 */
import { sitemapResponse } from '@/destinations/sitemaps';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ pais: string }> }) {
    const { pais } = await params;
    return /^[a-z0-9]+$/.test(pais) ? sitemapResponse(`sitemap-tours-${pais}.xml`) : new Response('Not found', { status: 404 });
}
