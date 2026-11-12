import { describe, it, expect } from 'vitest';
import { edgeCacheHeader, hasSessionCookie, EDGE_CACHE_VALUE } from './edge-cache';

const req = (pathname: string, o: { method?: string; cookies?: string[] } = {}) => ({ method: o.method ?? 'GET', pathname, cookieNames: o.cookies ?? [] });

describe('REQ-3318: qué peticiones se guardan en el borde (gates B y C)', () => {
  it('REQ-3318: el valor es 5 minutos en el borde con renovación en segundo plano (gate B)', () => {
    expect(EDGE_CACHE_VALUE).toBe('public, s-maxage=300, stale-while-revalidate=86400');
  });
  it('REQ-3318: páginas públicas GET sin sesión sí (gate C)', () => {
    for (const p of ['/', '/tours', '/viajes/malasia/x', '/destinos/japon', '/blog/algo', '/legal/terminos', '/ayuda']) expect(edgeCacheHeader(req(p)), p).toBe(EDGE_CACHE_VALUE);
  });
  it('REQ-3318: rutas privadas o de operación nunca', () => {
    for (const p of ['/admin', '/admin/viajes', '/api/x', '/mi-cuenta', '/mi-cuenta/reservas', '/reserva/abc', '/reserva/abc/modificar', '/login', '/signup', '/bookings', '/profile', '/dashboard', '/events/123', '/viajes/gracias', '/arma-tu-viaje']) expect(edgeCacheHeader(req(p)), p).toBeNull();
  });
  it('REQ-3318: con cookie de sesión nunca, aunque la ruta sea pública', () => {
    for (const c of ['authjs.session-token', '__Secure-authjs.session-token', 'next-auth.session-token', '__Secure-next-auth.session-token']) expect(hasSessionCookie([c]), c).toBe(true);
    expect(edgeCacheHeader(req('/tours', { cookies: ['__Secure-authjs.session-token'] }))).toBeNull();
  });
  it('REQ-3318: otros métodos que GET/HEAD nunca', () => {
    expect(edgeCacheHeader(req('/tours', { method: 'POST' }))).toBeNull();
    expect(edgeCacheHeader(req('/tours', { method: 'HEAD' }))).toBe(EDGE_CACHE_VALUE);
  });
});

describe('REQ-3318: el middleware aplica la regla en la respuesta final', () => {
  it('REQ-3318: middleware.ts envuelve su salida final con withEdgeCache (no las redirecciones)', async () => {
    const { readFileSync } = await import('node:fs');
    const m = readFileSync('src/middleware.ts', 'utf8');
    expect(m).toContain("import { withEdgeCache } from '@/perf/edge-cache'");
    expect(m.match(/return withEdgeCache\(request, pathname, loc\.finish\(\) \?\? NextResponse\.next\(\)\);/g)?.length).toBe(2);
  });
  it('REQ-3318: withEdgeCache pone el encabezado solo cuando la regla lo permite', async () => {
    const { withEdgeCache } = await import('../edge-cache');
    const mk = (cookie = '') => ({ method: 'GET', cookies: { getAll: () => (cookie ? [{ name: cookie, value: 'x' }] : []) } });
    const res = () => ({ headers: new Headers() });
    expect(withEdgeCache(mk(), '/tours', res()).headers.get('Cloudflare-CDN-Cache-Control')).toBe(EDGE_CACHE_VALUE);
    expect(withEdgeCache(mk('authjs.session-token'), '/tours', res()).headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
    expect(withEdgeCache(mk(), '/admin/viajes', res()).headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
  });
});

describe('REQ-3318: el borde solo guarda respuestas 200 (el plan gratis no permite TTL por código en la regla)', () => {
  it('REQ-3318: con estado distinto de 200 se quita el encabezado del borde', async () => {
    const { stripEdgeCacheUnlessOk } = await import('./edge-cache');
    for (const status of [500, 502, 503, 404, 301, 302]) {
      const r = new Response('x', { status, headers: { 'Cloudflare-CDN-Cache-Control': EDGE_CACHE_VALUE } });
      expect(stripEdgeCacheUnlessOk(r).headers.get('Cloudflare-CDN-Cache-Control'), String(status)).toBeNull();
    }
  });
  it('REQ-3318: un 200 conserva el encabezado y el cuerpo', async () => {
    const { stripEdgeCacheUnlessOk } = await import('./edge-cache');
    const r = stripEdgeCacheUnlessOk(new Response('hola', { status: 200, headers: { 'Cloudflare-CDN-Cache-Control': EDGE_CACHE_VALUE } }));
    expect(r.headers.get('Cloudflare-CDN-Cache-Control')).toBe(EDGE_CACHE_VALUE);
    expect(await r.text()).toBe('hola');
  });
  it('REQ-3318: toda respuesta del Worker pasa por stripEdgeCacheUnlessOk (desde REQ-3498, dentro de serveWithCache)', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/perf/worker-cache.ts', 'utf8')).toContain('stripEdgeCacheUnlessOk(await origin())');
    expect(readFileSync('worker.ts', 'utf8')).not.toMatch(/fetch: handler\.fetch,/);
  });
});
