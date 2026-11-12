/**
 * Cableado real de la carga de disponibilidad (REQ-3468): caché compartida de Cloudflare y tarifas del
 * proveedor por la pasarela. Es la única pieza que toca el mundo exterior; la lógica vive en
 * `availability.ts` y en `lib/`, que se prueban con dependencias de mentira (como `src/trips/cross-sell-deps.ts`).
 *
 * Con `TANGOL_ENABLED` apagado, `tangolConfig` devuelve null y `rangeRates` queda en null: no se llama a
 * nadie y la ficha se pinta sin calendario.
 */
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { createTangolApi } from "@/tangol/api";
import { tangolConfig } from "@/tangol/lib/config";
import { rangeRatesFromTangol } from "@/tangol/lib/rates";
import type { AvailabilityDeps } from "./availability";

interface Env {
  TANGOL_ENABLED?: string;
  GATEWAY_URL?: string;
  GATEWAY_SECRET?: string;
  /** Códigos de idioma y moneda de Tangol. Sin confirmar con el proveedor (REQ-1546): se ajustan sin tocar código. */
  TANGOL_LANGUAGE_CODE?: string;
  TANGOL_CURRENCY_CODE?: string;
}

// REQ-3468
export function availabilityDeps(env: Env, today: string): AvailabilityDeps {
  const config = tangolConfig(env);
  const api = config ? createTangolApi({ config, fetch }) : null;
  return {
    rangeRates: api
      ? async (externalId: number) =>
          rangeRatesFromTangol(
            await api.getTourRates({
              tourId: externalId,
              languageCode: env.TANGOL_LANGUAGE_CODE ?? "1",
              currency: env.TANGOL_CURRENCY_CODE ?? "0",
            }),
          )
      : null,
    // Una llamada por tour: la respuesta se comparte entre peticiones y centros de datos (REQ-032).
    cached: (key, load) => cached(cacheKey("disponibilidad", { key }), POLICY.tourDetail, load),
    today,
    log: (donde, err) => console.error(donde, err instanceof Error ? err.message : err),
  };
}
