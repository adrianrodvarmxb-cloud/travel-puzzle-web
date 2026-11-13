/**
 * Raíz de I/O del middleware de destinos: D1 de la petición (sin Prisma) + decisión de edge.ts.
 * Solo se llama con PRIMERA_PIEZA_ENABLED="true".
 * REQ-3540 (INC-015): si D1 falla, se reintenta una vez; agotados los intentos, una URL vieja responde 503
 * con Retry-After (nunca un 200 que se declare canónico de sí mismo) y el resto de rutas sigue como hoy.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { planDestinationsRequest } from './lib/request-plan';
import { decideDestinationsRequest } from './edge';
import { destinationsRepo } from './load';
import type { D1Read } from './repository';
import { isKindVisible, visibilityFromEnv } from '@/trips/lib/visibility';
import { decidirConReintento } from './lib/fallo-de-base';

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
    try {
        const { env } = await getCloudflareContext({ async: true });
        const db = (env as unknown as { DB?: D1Read }).DB;
        if (!db) return null;
        const vis = visibilityFromEnv(process.env as Record<string, string | undefined>);
        // REQ-3540: reintenta una vez; si D1 sigue fallando, decide según la ruta en vez de pasar de largo.
        const intento = await decidirConReintento(plan, () =>
            decideDestinationsRequest(pathname, searchParams, { repo: destinationsRepo(db), tripVisible: (k) => isKindVisible(k, vis) }),
        );
        if (!intento.ok) {
            console.error('[destinos] REQ-3540: D1 falló en', pathname, '→', (intento.causa as Error)?.message);
            if (!intento.respuesta) return null;
            // REQ-3540: la URL vieja solo existe para redirigir; con la base caída se dice «vuelve luego», no 200.
            return new NextResponse(null, {
                status: intento.respuesta.status,
                headers: { 'retry-after': String(intento.respuesta.retryAfter), 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
            });
        }
        const d = intento.valor;
        if (!d) return null;
        if (d.type === 'redirect') return NextResponse.redirect(new URL(localize(d.location), request.url), 301);
        if (d.type === 'rewrite') return NextResponse.rewrite(new URL(d.path, request.url), req);
        // REQ-092 / REQ-062: la página 410 es una página del sitio (header y footer); el visitante conserva su URL.
        return NextResponse.rewrite(new URL(d.path, request.url), { ...req, status: 410, headers: { 'x-robots-tag': 'noindex' } });
    } catch (error) {
        // Lo que no es un fallo de D1 (contexto de Cloudflare, URL mal formada): la URL sigue como hoy.
        console.error('[destinos] middleware:', (error as Error).message);
        return null;
    }
}
