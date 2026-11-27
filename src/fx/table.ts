/**
 * REQ-10874 · Tabla de cambio para el precio local (ola 9): Banxico (MXN/USD/EUR, `loadFx` de hoy) + Frankfurter
 * (las demás monedas) mezcladas por `mergeFxTables` (REQ-10767). Caché de medio día en el Cache API del Worker (en local
 * no hay y se consulta directo), igual que la de Banxico. Orquestación: recibe `fetch` y caché, nada más.
 */
import type { FxTable } from "@/ficha/lib/local-price";
import { loadFx } from "@/trips/public-load";
import { getFrankfurter } from "./frankfurter";
import { mergeFxTables } from "./lib/frankfurter";

const FRANK_KEY = "https://travelpuzzle.com.mx/__fx/frankfurter";

function frankfurterCache() {
  const c = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  return {
    async get() { const r = await c?.match(FRANK_KEY); return r ? ((await r.json()) as FxTable) : null; },
    async put(t: FxTable) { await c?.put(FRANK_KEY, new Response(JSON.stringify(t), { headers: { "Cache-Control": "max-age=43200" } })); },
  };
}

/** Tabla única (base MXN con Banxico; base EUR si solo responde Frankfurter); null si ninguna fuente responde. */
// REQ-10874
export async function loadFxTable(): Promise<FxTable | null> {
  const [banxico, frank] = await Promise.all([
    loadFx().catch(() => null),
    getFrankfurter({ fetch, cache: frankfurterCache() }),
  ]);
  return mergeFxTables(banxico, frank);
}
