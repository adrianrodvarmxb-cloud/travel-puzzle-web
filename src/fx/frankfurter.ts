/**
 * REQ-10874 · Lectura de Frankfurter (tasas de referencia del BCE, sin llave; fuente firmada en REQ-10767). I/O con
 * dependencias por parámetro (fetch y caché), como `src/trips/fx.ts` con Banxico: una consulta y caché de medio día;
 * si la red o la respuesta fallan, null y el sitio sigue (el precio se muestra en la moneda del proveedor, REQ-10823).
 */
import type { FxTable } from "@/ficha/lib/local-price";
import { parseFrankfurter } from "./lib/frankfurter";

export const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=EUR";

export interface FrankfurterDeps {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  cache: { get(): Promise<FxTable | null>; put(t: FxTable): Promise<unknown> };
}

// REQ-10874
export async function getFrankfurter(d: FrankfurterDeps): Promise<FxTable | null> {
  const cached = await d.cache.get().catch(() => null);
  if (cached) return cached;
  try {
    const res = await d.fetch(FRANKFURTER_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const table = parseFrankfurter(await res.json());
    if (table) await d.cache.put(table).catch(() => {});
    return table;
  } catch {
    return null;
  }
}
