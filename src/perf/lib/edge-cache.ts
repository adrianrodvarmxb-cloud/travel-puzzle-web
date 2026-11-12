// REQ-3318 (gates B y C, docs/gates-cache-html.md): qué respuestas puede guardar el borde de Cloudflare.
// Se usa `Cloudflare-CDN-Cache-Control` porque Next reescribe `Cache-Control` a `private, no-store` en las
// páginas dinámicas; el navegador no guarda nada, solo el borde.

/** Gate B: 5 minutos en el borde, renovación en segundo plano hasta 1 día. */
export const EDGE_CACHE_VALUE = 'public, s-maxage=300, stale-while-revalidate=86400';
export const EDGE_CACHE_HEADER = 'Cloudflare-CDN-Cache-Control';

/** Gate C: siempre fuera. `/events` y `/arma-tu-viaje` son el paso de reserva y el carrito (en vivo / personales). */
const PRIVATE_PREFIXES = ['/admin', '/api', '/mi-cuenta', '/reserva', '/login', '/signup', '/bookings', '/profile', '/dashboard', '/events', '/arma-tu-viaje', '/viajes/gracias'];

const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token', 'next-auth.session-token', '__Secure-next-auth.session-token'];

export function hasSessionCookie(cookieNames: string[]): boolean {
  // Auth.js parte la cookie grande en `.0`, `.1`…
  return cookieNames.some((n) => SESSION_COOKIES.some((s) => n === s || n.startsWith(`${s}.`)));
}

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Valor del encabezado para el borde, o null si esta petición no se debe guardar. */
export function edgeCacheHeader(r: { method: string; pathname: string; cookieNames: string[] }): string | null {
  if (r.method !== 'GET' && r.method !== 'HEAD') return null;
  if (isPrivatePath(r.pathname) || hasSessionCookie(r.cookieNames)) return null;
  return EDGE_CACHE_VALUE;
}
