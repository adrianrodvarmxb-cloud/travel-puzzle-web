/**
 * REQ-10763: dependencias reales del sync diario de Big Bus por OCTO. Vive aparte de `deps.ts` porque es el único lugar
 * de `src/octo` que toca el archivo crudo privado (`ingest/deps`, REQ-747): solo lo importa el cron `bigbus-sync`;
 * las rutas públicas de compra importan `deps.ts` y nunca llegan al bucket.
 */
import { rawArchiveFromEnv } from "@/ingest/deps";
import { idFor } from "@/trips/lib/bulk-import";
import type { CatalogSyncDeps } from "./catalog-sync";
import { AGENCY_INITIALS, BIGBUS_CITY_KEYWORDS, BIGBUS_CITY_REFS, octoApiFromEnv, planStoreFromEnv } from "./deps";

const env = () => process.env as Record<string, string | undefined>;

// REQ-3415, REQ-10763
export function catalogSyncDeps(now: Date): CatalogSyncDeps {
  return {
    api: octoApiFromEnv(),
    store: planStoreFromEnv(),
    // REQ-10763 (REQ-10761, firma del PO 17-11-2026: la respuesta OCTO es el documento original de Big Bus): la copia
    // exacta va al archivo privado RAW_ARCHIVE (solo con RAW_ARCHIVE_ENABLED="true") y cada producto se liga a su viaje.
    archive: rawArchiveFromEnv(env()),
    tripIdFor: (ref) => idFor(AGENCY_INITIALS, ref),
    cityRefs: BIGBUS_CITY_REFS,
    map: BIGBUS_CITY_KEYWORDS,
    now,
    runId: `bigbus-octo-${now.toISOString()}`,
  };
}
