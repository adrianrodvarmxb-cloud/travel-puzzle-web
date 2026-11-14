/**
 * Raíz de I/O del middleware de destinos: D1 de la petición (sin Prisma) + decisión de edge.ts.
 * Solo se llama con PRIMERA_PIEZA_ENABLED="true"; si algo falla, devuelve null y la URL sigue como hoy.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { planDestinationsRequest, isSiteNavigation } from './lib/request-plan';
import { decideDestinationsRequest } from './edge';
import { destinationsRepo } from './load';
import type { D1Read } from './repository';
import { isKindVisible, visibilityFromEnv } from '@/trips/lib/visibility';

/** REQ-658: con URL por idioma, el middleware pasa la ruta sin prefijo, cómo prefijar las 301 y los encabezados con x-tp-lang. */
export interface DestinationsMiddlewareOptions { pathname?: string; localize?: (path: string) => string; headers?: Headers | null }

// REQ-092 REQ-102 REQ-658
export async function destinationsMiddleware(request: NextRequest, opts: DestinationsMiddlewareOptions = {}): Promise<NextResponse | null> {
    const { searchParams } = request.nextUrl;
    const pathname = opts.pathname ?? request.nextUrl.pathname;
    const localize = opts.localize ?? ((p: string) => p);
    const req = opts.headers ? { request: { headers: opts.headers } } : {};
    const plan = planDestinationsRequest(pathname, searchParams);
    if (!plan) return null; // sin consulta a D1 para lo demás
    // REQ-10529: el filtro de país de Experiencias navega a /tours?countryId=; no es un enlace viejo.
    if (plan.kind === 'legacy-country' && isSiteNavigation((n) => request.headers.get(n), request.nextUrl.host)) return null;
    try {
        const { env } = await getCloudflareContext({ async: true });
        const db = (env as unknown as { DB?: D1Read }).DB;
        if (!db) return null;
        const vis = visibilityFromEnv(process.env as Record<string, string | undefined>);
        const d = await decideDestinationsRequest(pathname, searchParams, { repo: destinationsRepo(db), tripVisible: (k) => isKindVisible(k, vis) });
        if (!d) return null;
        if (d.type === 'redirect') return NextResponse.redirect(new URL(localize(d.location), request.url), 301);
        if (d.type === 'rewrite') return NextResponse.rewrite(new URL(d.path, request.url), req);
        // REQ-092 / REQ-062: la página 410 es una página del sitio (header y footer); el visitante conserva su URL.
        return NextResponse.rewrite(new URL(d.path, request.url), { ...req, status: 410, headers: { 'x-robots-tag': 'noindex' } });
    } catch (error) {
        console.error('[destinos] middleware:', (error as Error).message);
        return null;
    }
}
