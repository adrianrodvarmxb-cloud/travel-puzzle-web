// REQ-3498: caché de páginas dentro del Worker. I/O con dependencias inyectadas (Cache API y el sitio).
import { workerCacheKey, isStorable, toStored, toClient } from './lib/worker-cache';
import { stripEdgeCacheUnlessOk } from './lib/edge-cache';

export type PageCache = { match(key: string): Promise<Response | undefined>; put(key: string, res: Response): Promise<void> };
export type WaitCtx = { waitUntil(p: Promise<unknown>): void };

export async function serveWithCache(request: Request, origin: () => Promise<Response>, cache: PageCache, ctx: WaitCtx): Promise<Response> {
  const key = workerCacheKey(request);
  if (key) {
    try {
      const hit = await cache.match(key);
      if (hit) return toClient(hit, 'HIT');
    } catch (e) {
      console.error('[cache] match falló; sigue sin caché', e);
    }
  }
  const res = stripEdgeCacheUnlessOk(await origin());
  if (!key || !isStorable(res)) return res;
  ctx.waitUntil(cache.put(key, toStored(res.clone())).catch((e) => console.error('[cache] put falló', e)));
  return toClient(res, 'MISS');
}
