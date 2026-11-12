import { withRetry } from "./d1-load";

/**
 * INC-/tours-500 (12 nov 2026): dos cargas de /tours tumbaban la página entera cuando D1 tropezaba.
 * Regla 7 del blindaje: lo que no es el listado se oculta si falla; la página sigue. Puro: la base y la espera se inyectan.
 */
type Opts = { sleep?: (ms: number) => Promise<void>; log?: (msg: string, detail: string) => void };

// REQ-3489
export async function countryCodesFor(
  hasTrips: boolean,
  findMany: () => Promise<{ id: number; code: string }[]>,
  opts: Opts = {},
): Promise<Record<number, string>> {
  if (!hasTrips) return {};
  try {
    const rows = await withRetry(findMany, { sleep: opts.sleep });
    return Object.fromEntries(rows.map((c) => [c.id, c.code.toUpperCase()]));
  } catch (error) {
    (opts.log ?? console.error)("[tours] sin códigos de país de los viajes:", (error as Error)?.message ?? String(error));
    return {};
  }
}

// REQ-3490
export async function orFallback<T>(
  p: Promise<T>,
  fallback: T,
  what: string,
  log: (msg: string, detail: string) => void = console.error,
): Promise<T> {
  try {
    return await p;
  } catch (error) {
    log(`[tours] sin ${what}; la página sigue sin esa parte:`, (error as Error)?.message ?? String(error));
    return fallback;
  }
}
