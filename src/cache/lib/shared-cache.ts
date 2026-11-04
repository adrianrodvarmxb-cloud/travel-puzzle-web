/**
 * REQ-032 (INC-003): caché en dos niveles para que el tráfico no llegue a D1.
 *  L1: memoria del isolate, con single-flight (N peticiones simultáneas = 1 consulta).
 *  L2: caché compartida del centro de datos (Cache API de Cloudflare), inyectada.
 *  stale-while-error: si la base falla, se sirve la última copia buena dentro de `staleSec`.
 * Puro: el almacén L2 y el reloj se inyectan.
 */
export interface L2Store {
  get(key: string): Promise<{ at: number; body: string } | null>;
  put(key: string, value: { at: number; body: string }, maxAgeSec: number): Promise<void>;
}
export interface CachePolicy { ttlSec: number; staleSec: number }

export function cacheKey(prefix: string, parts: Record<string, unknown>): string {
  const clean = Object.keys(parts).sort().filter((k) => parts[k] !== undefined && parts[k] !== null && parts[k] !== "")
    .map((k) => `${k}=${typeof parts[k] === "object" ? JSON.stringify(parts[k]) : String(parts[k])}`);
  return `${prefix}?${clean.join("&")}`;
}

export function createSharedCache(deps: { l2: L2Store; now?: () => number; onError?: (where: string, err: unknown) => void }) {
  const now = deps.now ?? (() => Date.now());
  const log = deps.onError ?? (() => {});
  const l1 = new Map<string, { at: number; value: unknown }>();
  const inflight = new Map<string, Promise<unknown>>();

  async function l2get(key: string) {
    try { return await deps.l2.get(key); } catch (e) { log("l2.get", e); return null; }
  }

  return {
    async get<T>(key: string, policy: CachePolicy, load: () => Promise<T>): Promise<T> {
      const ttl = policy.ttlSec * 1000;
      const maxStale = ttl + policy.staleSec * 1000;
      const hit = l1.get(key);
      if (hit && now() - hit.at < ttl) return hit.value as T;

      const running = inflight.get(key);
      if (running) return running as Promise<T>;

      const job = (async () => {
        const shared = await l2get(key);
        if (shared && now() - shared.at < ttl) {
          const value = JSON.parse(shared.body) as T;
          l1.set(key, { at: shared.at, value });
          return value;
        }
        try {
          const value = await load();
          const at = now();
          l1.set(key, { at, value });
          try { await deps.l2.put(key, { at, body: JSON.stringify(value) }, policy.ttlSec + policy.staleSec); } catch (e) { log("l2.put", e); }
          return value;
        } catch (err) {
          const stale = [hit && { at: hit.at, value: hit.value }, shared && { at: shared.at, value: JSON.parse(shared.body) }]
            .filter((x): x is { at: number; value: unknown } => !!x && now() - x.at < maxStale)
            .sort((a, b) => b.at - a.at)[0];
          if (stale) { log("stale-served", err); return stale.value as T; }
          throw err;
        }
      })();
      inflight.set(key, job);
      try { return (await job) as T; } finally { inflight.delete(key); }
    },
  };
}
