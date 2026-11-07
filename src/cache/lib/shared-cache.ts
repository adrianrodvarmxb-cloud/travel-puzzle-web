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
/**
 * REQ-1359: copia anterior mientras se arma la nueva (stale-while-revalidate al cambiar la versión de la llave).
 * Solo actúa si hay `background` (waitUntil del Worker); sin él, todo igual que antes.
 */
export interface StaleOptions {
  /** Llaves de versiones anteriores (la más nueva primero). */
  previousKeys?: string[];
  /** ¿La copia anterior tiene la forma que el código de hoy sabe pintar? */
  accept?: (value: unknown) => boolean;
  /** waitUntil: la reconstrucción sigue después de responder. */
  background?: (job: Promise<unknown>) => void;
}

export function cacheKey(prefix: string, parts: Record<string, unknown>): string {
  const clean = Object.keys(parts).sort().filter((k) => parts[k] !== undefined && parts[k] !== null && parts[k] !== "")
    .map((k) => `${k}=${typeof parts[k] === "object" ? JSON.stringify(parts[k]) : String(parts[k])}`);
  return `${prefix}?${clean.join("&")}`;
}

export function createSharedCache(deps: {
  l2: L2Store; now?: () => number; onError?: (where: string, err: unknown) => void;
  /** REQ-036: cuánto espera un visitante la consulta que ya lanzó otro antes de hacer la suya. */
  waitMs?: number; delay?: (ms: number) => Promise<void>;
}) {
  const now = deps.now ?? (() => Date.now());
  const log = deps.onError ?? (() => {});
  const waitMs = deps.waitMs ?? 1500;
  const delay = deps.delay ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const l1 = new Map<string, { at: number; value: unknown }>();
  // REQ-036 (INC-003): en Workers una promesa creada por otra petición puede no resolverse nunca
  // ("A promise was resolved ... from a different request context"); por eso se espera con tope.
  const inflight = new Map<string, { at: number; job: Promise<unknown> }>();
  // REQ-1359: llaves que ya se están reconstruyendo en segundo plano (una sola reconstrucción por isolate a la vez).
  const refreshing = new Map<string, number>();
  const REFRESH_GUARD_MS = 60_000;
  const TIMEOUT = Symbol('timeout');

  async function l2get(key: string) {
    try { return await deps.l2.get(key); } catch (e) { log("l2.get", e); return null; }
  }

  /** REQ-1359: la copia más reciente de una versión anterior que aún sirva (dentro de `staleSec` y con la forma aceptada). */
  async function previous(opts: StaleOptions, maxStale: number): Promise<unknown | null> {
    for (const k of opts.previousKeys ?? []) {
      const mem = l1.get(k);
      const cand = mem ? { at: mem.at, value: mem.value } : await l2get(k).then((r) => (r ? { at: r.at, value: JSON.parse(r.body) as unknown } : null)).catch(() => null);
      if (cand && now() - cand.at < maxStale && (!opts.accept || opts.accept(cand.value))) return cand.value;
    }
    return null;
  }

  return {
    async get<T>(key: string, policy: CachePolicy, load: () => Promise<T>, opts: StaleOptions = {}): Promise<T> {
      const ttl = policy.ttlSec * 1000;
      const maxStale = ttl + policy.staleSec * 1000;
      const hit = l1.get(key);
      if (hit && now() - hit.at < ttl) return hit.value as T;

      const running = inflight.get(key);
      if (running && now() - running.at < waitMs) {
        const r = await Promise.race([running.job.then((v) => v, () => TIMEOUT), delay(waitMs).then(() => TIMEOUT)]);
        if (r !== TIMEOUT) return r as T;
        log('inflight-timeout', key);
      }

      const job = (async () => {
        const shared = await l2get(key);
        if (shared && now() - shared.at < ttl) {
          const value = JSON.parse(shared.body) as T;
          l1.set(key, { at: shared.at, value });
          return value;
        }
        // REQ-1359: llave nueva sin copia (cambio de versión): se sirve la de la versión anterior y la nueva se arma aparte.
        if (opts.background && opts.previousKeys?.length && !shared && !hit) {
          const prev = await previous(opts, maxStale);
          if (prev) {
            const started = refreshing.get(key);
            if (!started || now() - started > REFRESH_GUARD_MS) {
              refreshing.set(key, now());
              opts.background((async () => {
                try {
                  const value = await load();
                  const at = now();
                  l1.set(key, { at, value });
                  await deps.l2.put(key, { at, body: JSON.stringify(value) }, policy.ttlSec + policy.staleSec);
                } catch (e) { log("background-refresh", e); } finally { refreshing.delete(key); }
              })());
            }
            log("previous-served", key);
            return prev as T;
          }
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
      const entry = { at: now(), job };
      inflight.set(key, entry);
      try { return (await job) as T; } finally { if (inflight.get(key) === entry) inflight.delete(key); }
    },
  };
}
