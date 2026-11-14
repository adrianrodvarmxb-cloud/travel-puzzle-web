import { describe, it, expect, vi } from 'vitest';
import { serveWithCache } from './worker-cache';
import { EDGE_CACHE_HEADER, EDGE_CACHE_VALUE } from './lib/edge-cache';

function fakeCache() {
  const m = new Map<string, Response>();
  return {
    m,
    match: async (k: string) => m.get(k)?.clone(),
    put: async (k: string, r: Response) => { m.set(k, r); },
  };
}
const ctx = () => { const p: Promise<unknown>[] = []; return { waitUntil: (x: Promise<unknown>) => p.push(x), done: () => Promise.all(p) }; };
const page = (status = 200) => new Response(`v${Math.random()}`, { status, headers: status === 200 ? { [EDGE_CACHE_HEADER]: EDGE_CACHE_VALUE } : {} });

describe('REQ-3498: serveWithCache (caché del Worker con dependencias inyectadas)', () => {
  it('REQ-3498: primera visita MISS y se guarda; la segunda es HIT sin llamar al sitio', async () => {
    const cache = fakeCache(); const origin = vi.fn(async () => page()); const c = ctx();
    const r1 = await serveWithCache(new Request('https://travelpuzzle.com.mx/tours'), origin, cache, c);
    await c.done();
    expect(r1.headers.get('x-tp-cache')).toBe('MISS');
    const body1 = await r1.text();
    const r2 = await serveWithCache(new Request('https://travelpuzzle.com.mx/tours'), origin, cache, ctx());
    expect(r2.headers.get('x-tp-cache')).toBe('HIT');
    expect(await r2.text()).toBe(body1);
    expect(origin).toHaveBeenCalledTimes(1);
  });
  it('REQ-3498: con sesión no lee ni escribe la caché', async () => {
    const cache = fakeCache(); const origin = vi.fn(async () => page()); const c = ctx();
    const r = await serveWithCache(new Request('https://travelpuzzle.com.mx/tours', { headers: { cookie: 'authjs.session-token=x' } }), origin, cache, c);
    await c.done();
    expect(r.headers.get('x-tp-cache')).toBeNull();
    expect(cache.m.size).toBe(0);
  });
  it('REQ-3498: un error 5xx nunca se guarda', async () => {
    const cache = fakeCache(); const c = ctx();
    const r = await serveWithCache(new Request('https://travelpuzzle.com.mx/tours'), async () => page(500), cache, c);
    await c.done();
    expect(r.status).toBe(500);
    expect(cache.m.size).toBe(0);
  });
  it('REQ-3498: si la Cache API falla, la página sale igual del sitio', async () => {
    const broken = { match: async () => { throw new Error('caída'); }, put: async () => { throw new Error('caída'); } };
    const r = await serveWithCache(new Request('https://travelpuzzle.com.mx/tours'), async () => page(), broken, ctx());
    expect(r.status).toBe(200);
  });
  it('REQ-3498: cada idioma tiene su copia', async () => {
    const cache = fakeCache(); const c = ctx();
    await serveWithCache(new Request('https://travelpuzzle.com.mx/ayuda', { headers: { cookie: 'preferredLanguage=en' } }), async () => page(), cache, c);
    await c.done();
    const r = await serveWithCache(new Request('https://travelpuzzle.com.mx/ayuda', { headers: { cookie: 'preferredLanguage=es' } }), async () => page(), cache, ctx());
    expect(r.headers.get('x-tp-cache')).toBe('MISS');
  });
});

describe('REQ-3498: worker.ts usa la caché', () => {
  it('REQ-3498: fetch del Worker pasa por serveWithCache con caches.default', async () => {
    const { readFileSync } = await import('node:fs');
    const w = readFileSync('worker.ts', 'utf8');
    expect(w).toContain("import { serveWithCache, type PageCache } from \"./src/perf/worker-cache\"");
    expect(w).toMatch(/serveWithCache\(request, \(\) => handler\.fetch\(request, env, ctx\), \(caches as unknown as \{ default: PageCache \}\)\.default, ctx\)/);
  });
});
