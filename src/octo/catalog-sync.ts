import type { OctoApi } from "./api";
import { buildCatalogPlan, type CatalogPlan, type CityKeywords } from "./lib/catalog";
import { archiveRawItems, type ArchiveReport, type RawArchive } from "@/ingest/raw-archive";

/** Dónde vive el plan del catálogo (R2 privado). La ficha lo lee para saber qué se compra directo. */
export interface PlanStore {
  load(): Promise<CatalogPlan | null>;
  save(plan: CatalogPlan): Promise<void>;
}

export interface CatalogSyncDeps {
  /** null = bandera apagada o sin llave. */
  api: Pick<OctoApi, "getProducts"> | null;
  store: PlanStore;
  archive?: RawArchive;
  cityRefs: string[];
  map: CityKeywords;
  now: Date;
  runId: string;
}

export type CatalogSyncResult =
  | { status: "disabled" }
  | { status: "error"; message: string }
  | { status: "kept"; reason: string }
  | {
      status: "ok";
      cities: number;
      notResold: string[];
      unmatched: number;
      unpriced: number;
      discarded: number;
      archive: ArchiveReport | null;
    };

export const OCTO_PROVIDER = "bigbus-octo";

/**
 * Sincronización diaria del catálogo de Big Bus por OCTO (ola 2).
 * Copia exacta a R2 privado (regla del 6 nov) y plan sin net para la ficha. Nunca escribe en D1 de viajes.
 * Si la API falla o regresa vacía cuando antes había ciudades, se conserva el plan anterior.
 */
// REQ-3415
export async function runBigBusCatalogSync(d: CatalogSyncDeps): Promise<CatalogSyncResult> {
  if (!d.api) return { status: "disabled" };
  let res: Awaited<ReturnType<OctoApi["getProducts"]>>;
  try {
    res = await d.api.getProducts();
  } catch (e) {
    console.error("[bigbus-octo] no se pudo leer el catálogo:", (e as Error).message);
    return { status: "error", message: (e as Error).message };
  }

  const archive = d.archive
    ? await archiveRawItems(d.archive, {
        provider: OCTO_PROVIDER,
        items: res.raw.map((body) => ({ externalId: (body as { id?: unknown })?.id ? String((body as { id: unknown }).id) : null, body })),
        runId: d.runId,
        now: d.now,
      })
    : null;

  const plan = buildCatalogPlan(res.items, d.cityRefs, d.map, d.now);
  if (plan.cities.length === 0) {
    const prev = await d.store.load().catch(() => null);
    if (prev && prev.cities.length > 0) {
      console.warn("[bigbus-octo] la API no trajo ciudades; se conserva el plan anterior");
      return { status: "kept", reason: "La API no trajo ningún producto ligado; se conservó el plan anterior" };
    }
  }
  await d.store.save(plan);
  return {
    status: "ok",
    cities: plan.cities.length,
    notResold: plan.notResold,
    unmatched: plan.unmatched.length,
    unpriced: plan.unpriced.length,
    discarded: res.discarded,
    archive,
  };
}
