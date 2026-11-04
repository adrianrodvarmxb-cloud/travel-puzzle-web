import { createSharedCache, type L2Store, type CachePolicy } from './lib/shared-cache';

/**
 * REQ-032: caché compartida real. L2 = Cache API de Cloudflare (por centro de datos, sin costo y
 * sin tocar D1). Fuera de Workers (build, tests) no hay `caches.default` y se usa solo L1.
 */
const BASE = 'https://cache.travelpuzzle.internal/';

function cloudflareL2(): L2Store {
  const store = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (!store) return { get: async () => null, put: async () => {} };
  return {
    async get(key) {
      const res = await store.match(BASE + encodeURIComponent(key));
      if (!res) return null;
      return { at: Number(res.headers.get('x-stored-at') || 0), body: await res.text() };
    },
    async put(key, value, maxAgeSec) {
      await store.put(BASE + encodeURIComponent(key), new Response(value.body, {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${maxAgeSec}`, 'x-stored-at': String(value.at) },
      }));
    },
  };
}

const shared = createSharedCache({
  l2: cloudflareL2(),
  onError: (where, err) => console.warn(`[cache] ${where}:`, err instanceof Error ? err.message : err),
});

/** Políticas (segundos). El catálogo se sincroniza una vez al día; 5–60 min es seguro. */
export const POLICY = {
  toursList: { ttlSec: 300, staleSec: 3600 },
  tourDetail: { ttlSec: 600, staleSec: 6 * 3600 },
  countries: { ttlSec: 3600, staleSec: 24 * 3600 },
  metadata: { ttlSec: 600, staleSec: 24 * 3600 },
  home: { ttlSec: 300, staleSec: 6 * 3600 },
} satisfies Record<string, CachePolicy>;

export function cached<T>(key: string, policy: CachePolicy, load: () => Promise<T>): Promise<T> {
  return shared.get(key, policy, load);
}
export { cacheKey } from './lib/shared-cache';
