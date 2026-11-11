import { countryTranslations } from "@/destinations/lib/ids";
/**
 * INC-003: D1 se saturaba ("D1 DB is overloaded. Too many resources consumed within a 10 second
 * window") y /tours caía en pantalla blanca. Puro: sin red ni base; el tiempo y la espera se inyectan.
 */

/** REQ-029: ¿el error (o su causa) es D1 saturada? */
export function isD1Overloaded(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 5 && e; i++) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/D1 DB is overloaded|Too many resources consumed/i.test(msg)) return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/** REQ-029: reintenta con espera creciente solo cuando D1 está saturada. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { tries?: number; baseMs?: number; sleep?: (ms: number) => Promise<void>; jitter?: () => number } = {},
): Promise<T> {
  const tries = opts.tries ?? 4;
  const baseMs = opts.baseMs ?? 400;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= tries || !isD1Overloaded(err)) throw err;
      await sleep(baseMs * i + Math.floor((opts.jitter ?? Math.random)() * baseMs)); // espera creciente + jitter
    }
  }
}

/** REQ-030: caché en memoria por tiempo (por isolate). Los errores no se guardan. */
export function createTtlCache<V>(opts: { ttlMs: number; now?: () => number }) {
  const now = opts.now ?? (() => Date.now());
  const store = new Map<string, { at: number; value: Promise<V> }>();
  return {
    async get(key: string, load: () => Promise<V>): Promise<V> {
      const hit = store.get(key);
      if (hit && now() - hit.at < opts.ttlMs) return hit.value;
      const value = load();
      store.set(key, { at: now(), value });
      try {
        return await value;
      } catch (err) {
        if (store.get(key)?.value === value) store.delete(key);
        throw err;
      }
    },
  };
}

export interface CountryRow { id: number; code: string; translations: unknown }
export interface CountryGroup { countryId: number; _count: { _all: number } }

/** REQ-031: países con tours activos y su conteo, a partir de un GROUP BY (misma forma que antes). */
export function countriesWithCounts<C extends CountryRow>(countries: C[], groups: CountryGroup[]) {
  const counts = new Map(groups.map((g) => [g.countryId, g._count._all]));
  return countries
    .filter((c) => (counts.get(c.id) ?? 0) > 0)
    .sort((a, b) => a.id - b.id)
    .map((c) => ({ ...c, translations: countryTranslations(c.code, c.translations) as C["translations"], _count: { tours: counts.get(c.id)! } })); // REQ-1265
}
