import { describe, it, expect } from 'vitest';
import { workerCacheKey, isStorable, toStored, toClient, parseCookies } from './worker-cache';
import { EDGE_CACHE_HEADER, EDGE_CACHE_VALUE } from './edge-cache';

const req = (url: string, h: Record<string, string> = {}, method = 'GET') => new Request(url, { method, headers: h });
const ok = (extra: Record<string, string> = {}) => new Response('<html>hola</html>', { status: 200, headers: { [EDGE_CACHE_HEADER]: EDGE_CACHE_VALUE, 'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate', ...extra } });

describe('REQ-3498: qué peticiones usan la caché del Worker', () => {
  it('REQ-3498: GET pública sin sesión → llave con la URL y el idioma de la cookie', () => {
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/tours?ciudad=roma'))).toBe('https://travelpuzzle.com.mx/tours?ciudad=roma#tp-lang=');
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/tours', { cookie: 'preferredLanguage=en; otra=1' }))).toBe('https://travelpuzzle.com.mx/tours#tp-lang=en');
  });
  it('REQ-3498: sin llave si hay sesión, ruta privada, POST/HEAD o navegación interna de Next', () => {
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/tours', { cookie: '__Secure-authjs.session-token=x' }))).toBeNull();
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/admin/viajes'))).toBeNull();
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/api/map/cities'))).toBeNull();
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/tours', {}, 'POST'))).toBeNull();
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/tours', {}, 'HEAD'))).toBeNull();
    for (const h of ['rsc', 'next-router-prefetch', 'next-router-state-tree', 'next-action']) expect(workerCacheKey(req('https://travelpuzzle.com.mx/tours', { [h]: '1' })), h).toBeNull();
  });
  it('REQ-3498: estáticos y recursos con hash no pasan por esta caché', () => {
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/_next/static/chunks/a.js'))).toBeNull();
    expect(workerCacheKey(req('https://travelpuzzle.com.mx/cdn-cgi/image/width=640/x.jpg'))).toBeNull();
  });
  it('REQ-3498: parseCookies lee nombres y valores', () => {
    expect(parseCookies('a=1; preferredLanguage=en;b=x=y')).toEqual({ a: '1', preferredLanguage: 'en', b: 'x=y' });
    expect(parseCookies(null)).toEqual({});
  });
});

describe('REQ-3498: qué respuestas se guardan y cómo salen', () => {
  it('REQ-3498: solo 200 con la marca del borde y sin Set-Cookie', () => {
    expect(isStorable(ok())).toBe(true);
    expect(isStorable(new Response('x', { status: 200 }))).toBe(false);
    expect(isStorable(new Response('x', { status: 500, headers: { [EDGE_CACHE_HEADER]: EDGE_CACHE_VALUE } }))).toBe(false);
    expect(isStorable(ok({ 'set-cookie': 'a=1' }))).toBe(false);
  });
  it('REQ-3498: la copia guardada vive 5 min en la Cache API y no lleva la marca del borde', () => {
    const s = toStored(ok());
    expect(s.headers.get('cache-control')).toBe('public, max-age=300');
    expect(s.headers.get(EDGE_CACHE_HEADER)).toBeNull();
  });
  it('REQ-3498: al navegador siempre le sale private/no-store, con x-tp-cache', async () => {
    const c = toClient(toStored(ok()), 'HIT');
    expect(c.headers.get('cache-control')).toBe('private, no-cache, no-store, max-age=0, must-revalidate');
    expect(c.headers.get('x-tp-cache')).toBe('HIT');
    expect(await c.text()).toBe('<html>hola</html>');
  });
});
