/**
 * REQ-111: métricas de «La Primera Pieza» con las metas firmadas por el PO (gate 5, 5 nov 2026).
 * Funciones puras: reciben los datos ya leídos (D1, log de corridas, eventos).
 */
import type { CarouselEvent } from "@/companions/lib/events";

export const METRIC_TARGETS = {
  /** ≥ 98 % de tours con ciudad válida. */
  validCityPct: 98,
  /** 0 slugs duplicados. */
  duplicateSlugs: 0,
  /** < 26 h desde el último sync exitoso. */
  hoursSinceSync: 26,
  /** ≥ 95 % de corridas exitosas en 30 días. */
  syncSuccessPct: 95,
  /** ≤ 5 ciudades que cambian de indexación por semana. */
  indexingChangesPerWeek: 5,
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** REQ-111: % de tours cuya ciudad existe. Sin tours = 100. */
export function pctToursWithValidCity(tours: { cityId: string | null }[], validCityIds: Set<string>): number {
  if (tours.length === 0) return 100;
  return round1((tours.filter((t) => t.cityId !== null && validCityIds.has(t.cityId)).length / tours.length) * 100);
}

/** REQ-111: slugs repetidos (sin distinguir mayúsculas), ordenados. */
export function duplicateSlugs(slugs: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const s of slugs) {
    const k = s?.trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) dup.add(k);
    seen.add(k);
  }
  return [...dup].sort();
}

export interface SyncRunSummary { status: "success" | "failed" | "aborted"; finishedAt: string }

/** REQ-111: horas desde el último sync exitoso; null si nunca hubo uno. */
export function hoursSinceLastSuccess(runs: SyncRunSummary[], now: number): number | null {
  const last = Math.max(...runs.filter((r) => r.status === "success").map((r) => Date.parse(r.finishedAt)), -Infinity);
  return Number.isFinite(last) ? round1((now - last) / 3_600_000) : null;
}

/** REQ-111: % de corridas exitosas en la ventana (30 días por defecto); null sin corridas. */
export function syncSuccessRate(runs: SyncRunSummary[], now: number, days = 30): number | null {
  const from = now - days * 86_400_000;
  const inWindow = runs.filter((r) => Date.parse(r.finishedAt) >= from);
  if (inWindow.length === 0) return null;
  return round1((inWindow.filter((r) => r.status === "success").length / inWindow.length) * 100);
}

/** REQ-111: ciudades cuyo estado de indexación cambió entre dos fotos (hace 7 días y hoy). */
export function indexingChanges(before: Record<string, boolean>, after: Record<string, boolean>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => (before[k] ?? false) !== (after[k] ?? false)).sort();
}

/** REQ-111: % de tarjetas agregadas sobre vistas, por categoría; null si no hubo vistas. */
export function addRateByCategory(events: CarouselEvent[]): Record<string, number | null> {
  const views: Record<string, number> = {};
  const adds: Record<string, number> = {};
  for (const e of events) {
    if (e.name === "card_viewed") views[e.type] = (views[e.type] ?? 0) + 1;
    if (e.name === "card_added") adds[e.type] = (adds[e.type] ?? 0) + 1;
  }
  const out: Record<string, number | null> = {};
  for (const t of new Set([...Object.keys(views), ...Object.keys(adds)])) {
    out[t] = views[t] ? round1(((adds[t] ?? 0) / views[t]) * 100) : null;
  }
  return out;
}

export interface MetricValues {
  validCityPct: number;
  duplicateSlugs: number;
  hoursSinceSync: number | null;
  syncSuccessPct: number | null;
  indexingChangesPerWeek: number;
}

/** REQ-111: ¿cumple cada meta? Sin dato = no cumple (no se simula). */
export function evaluateMetrics(v: MetricValues): Record<keyof MetricValues, boolean> {
  const t = METRIC_TARGETS;
  return {
    validCityPct: v.validCityPct >= t.validCityPct,
    duplicateSlugs: v.duplicateSlugs <= t.duplicateSlugs,
    hoursSinceSync: v.hoursSinceSync !== null && v.hoursSinceSync < t.hoursSinceSync,
    syncSuccessPct: v.syncSuccessPct !== null && v.syncSuccessPct >= t.syncSuccessPct,
    indexingChangesPerWeek: v.indexingChangesPerWeek <= t.indexingChangesPerWeek,
  };
}
