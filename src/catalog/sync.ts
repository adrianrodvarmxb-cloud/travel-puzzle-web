import type { TourAPI } from "@/types";
import { planSyncStep, type SyncState } from "./lib/sync-plan";
import { toTourRows, cityIdsOf, countryRow, LANGUAGES, type TourRow, type TranslationRow } from "./lib/tour-rows";

/** Lo que la sincronización necesita de la base de datos (implementado con Prisma en repository.ts). */
export interface CatalogRepo {
  getState(): Promise<SyncState | null>;
  saveState(state: Partial<SyncState> & { lastSyncAt?: Date; toursCount?: number }): Promise<void>;
  existingCityIds(ids: number[]): Promise<number[]>;
  upsertCountries(rows: ReturnType<typeof countryRow>[]): Promise<void>;
  upsertCities(rows: { id: number; countryId: number; translations: Record<string, string> }[]): Promise<void>;
  upsertTours(rows: { tour: TourRow; translations: TranslationRow[] }[]): Promise<void>;
  deactivateNotSeenSince(date: Date): Promise<number>;
}

interface Deps {
  api: { get(path: string): Promise<any> };
  repo: CatalogRepo;
  /** Lista de data/countries.json (no hace falta pedirla a la API). */
  countries: Parameters<typeof countryRow>[0][];
  now: Date;
}

/**
 * Una ejecución del cron: procesa como máximo UNA página del catálogo.
 * Devuelve qué hizo, para registrarlo en los logs.
 */
export async function runSyncStep({ api, repo, countries, now }: Deps) {
  const state = await repo.getState();
  const step = planSyncStep(state, now);

  if (step.action === "idle") return step;

  if (step.action === "finish") {
    const deactivated = await repo.deactivateNotSeenSince(state!.runStartedAt!);
    await repo.saveState({ status: "completed", lastSyncAt: now });
    return { action: "finish" as const, deactivated };
  }

  const runStartedAt = step.action === "start" ? now : state!.runStartedAt!;
  try {
    const body = await api.get(`/tours?page=${step.page}`);
    const tours: TourAPI[] = body.data.tours;
    const totalPages: number = body.data.totalPages;

    if (step.action === "start") {
      await repo.upsertCountries(countries.map(countryRow));
    }

    // Ciudades: solo se piden a la API las que aún no existen.
    const byCountry = cityIdsOf(tours);
    const existing = new Set(await repo.existingCityIds([...byCountry.values()].flat()));
    for (const [countryId, cityIds] of byCountry) {
      const missing = cityIds.filter((id) => !existing.has(id));
      if (missing.length === 0) continue;
      const cities = await api.get(`/cities/${countryId}`).then((r) => r.data as { id: number; title: Record<string, string> }[]).catch(() => []);
      const names = new Map(cities.map((c) => [c.id, c.title]));
      await repo.upsertCities(
        missing.map((id) => ({
          id,
          countryId,
          translations: Object.fromEntries(LANGUAGES.map((l) => [l, names.get(id)?.[l] || `Ciudad ${id}`])),
        }))
      );
    }

    await repo.upsertTours(tours.map((t) => toTourRows(t, runStartedAt)));
    await repo.saveState({ status: "in_progress", nextPage: step.page + 1, totalPages, runStartedAt, lastSyncAt: now });
    return { action: step.action, page: step.page, totalPages, tours: tours.length };
  } catch (error) {
    await repo.saveState({ status: "failed", nextPage: step.page, runStartedAt, lastSyncAt: now });
    throw error;
  }
}
