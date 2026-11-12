// REQ-3498: reglas puras de la caché de páginas dentro del Worker (Cache API). Gates B y C en docs/gates-cache-html.md.
import { edgeCacheHeader, EDGE_CACHE_HEADER } from './edge-cache';

const NEXT_INTERNAL = ['rsc', 'next-router-prefetch', 'next-router-state-tree', 'next-action'];
const NOT_PAGES = ['/_next/', '/cdn-cgi/'];
const BROWSER_NO_STORE = 'private, no-cache, no-store, max-age=0, must-revalidate';
/** Gate B: 5 minutos. */
const STORED_CACHE_CONTROL = 'public, max-age=300';

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** Llave de la Cache API (URL + idioma de la cookie), o null si esta petición no usa la caché. */
export function workerCacheKey(request: Request): string | null {
  if (request.method !== 'GET') return null;
  if (NEXT_INTERNAL.some((h) => request.headers.has(h))) return null;
  const url = new URL(request.url);
  if (NOT_PAGES.some((p) => url.pathname.startsWith(p))) return null;
  const cookies = parseCookies(request.headers.get('cookie'));
  if (!edgeCacheHeader({ method: 'GET', pathname: url.pathname, cookieNames: Object.keys(cookies) })) return null;
  url.hash = '';
  return `${url.toString()}#tp-lang=${cookies.preferredLanguage ?? ''}`;
}

/** Solo un 200 que el sitio marcó como guardable y sin Set-Cookie. */
export function isStorable(res: Response): boolean {
  return res.status === 200 && res.headers.has(EDGE_CACHE_HEADER) && !res.headers.has('set-cookie');
}

/** Copia para la Cache API: 5 min, sin la marca del borde. */
export function toStored(res: Response): Response {
  const out = new Response(res.body, res);
  out.headers.set('cache-control', STORED_CACHE_CONTROL);
  out.headers.delete(EDGE_CACHE_HEADER);
  return out;
}

/** Lo que recibe el navegador: nunca guardable en su lado; `x-tp-cache` dice si salió de la caché. */
export function toClient(res: Response, status: 'HIT' | 'MISS'): Response {
  const out = new Response(res.body, res);
  out.headers.set('cache-control', BROWSER_NO_STORE);
  out.headers.delete(EDGE_CACHE_HEADER);
  out.headers.set('x-tp-cache', status);
  return out;
}
