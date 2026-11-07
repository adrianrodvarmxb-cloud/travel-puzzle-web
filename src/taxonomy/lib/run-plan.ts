/**
 * T2b: recálculo de la taxonomía al cerrar cada sync exitoso (REQ-408, REQ-409), por tandas y con publicación atómica.
 * Puro: qué hacer en cada minuto, cómo pasar una fila de Tour o de Trip al clasificador, qué filas escribir y la
 * barrera de cordura. El I/O vive en ../recompute.ts y ../repository.ts.
 */
import type { Dictionary, Mapping } from "../schemas/dictionary";
import type { ClassifyInput, ClassifyResult } from "./types";

/** Tours clasificados por minuto (una consulta de lectura y unos cuantos INSERT en lote). */
export const TAXONOMY_BATCH = 500;
/** Corridas publicadas que se conservan (las anteriores se podan; nunca datos del proveedor). */
export const KEEP_TAXONOMY_RUNS = 3;
/** Barrera (plan §6.1): se aborta si más de 20 % queda sin formato o si un formato cae más de 30 %. */
export const MAX_UNCLASSIFIED_PCT = 20;
export const MAX_FORMAT_DROP_PCT = 30;
/** Un formato con menos de esto en la corrida anterior no dispara la barrera (ruido de pocos tours). */
export const MIN_FORMAT_FOR_DROP = 20;

/** REQ-409: bandera TAXONOMY_SYNC_ENABLED; solo "true" exacto la enciende. */
export function taxonomySyncEnabled(env: { TAXONOMY_SYNC_ENABLED?: string }): boolean {
  return env.TAXONOMY_SYNC_ENABLED === "true";
}

export function mappingVersion(dict: Dictionary, mappings: Record<string, Mapping>): string {
  return [`dict:${dict.version}`, ...Object.values(mappings).sort((a, b) => a.proveedor.localeCompare(b.proveedor)).map((m) => `${m.proveedor}:${m.version}`)].join("|");
}

/** Cursor que marca que ya no quedan tours por clasificar en la corrida (mayor que cualquier id). */
export const TOURS_DONE = "~";

export interface RunInfo { id: string; status: "running" | "published" | "aborted"; startedAt: string; cursor: string; tripsDone: boolean; mappingVersion: string }

export type TaxonomyAction =
  | { action: "idle" }
  | { action: "start" }
  | { action: "tours"; run: RunInfo }
  | { action: "trips"; run: RunInfo }
  | { action: "close"; run: RunInfo };

/**
 * Qué hacer este minuto. Se empieza una corrida nueva cuando no hay ninguna publicada, cuando el último sync exitoso
 * terminó después de la última publicada o cuando cambió el diccionario o un mapeo. Una corrida en curso con otra
 * versión del mapeo se reinicia.
 */
export function planTaxonomyStep(input: {
  running: RunInfo | null; lastPublished: RunInfo | null; lastSyncAt: string | null; version: string;
}): TaxonomyAction {
  const { running, lastPublished, lastSyncAt, version } = input;
  if (running && running.mappingVersion === version) {
    if (running.cursor !== TOURS_DONE) return { action: "tours", run: running };
    if (!running.tripsDone) return { action: "trips", run: running };
    return { action: "close", run: running };
  }
  if (running) return { action: "start" };
  if (!lastPublished || lastPublished.mappingVersion !== version) return { action: "start" };
  if (lastSyncAt && lastSyncAt > lastPublished.startedAt) return { action: "start" };
  return { action: "idle" };
}

export interface TourRowForTaxonomy {
  id: string; categoryId: number; priceValue: number | string | null; durationMinutes: number | null;
  titleEs: string | null; titleEn: string | null; briefEs: string | null; briefEn: string | null;
  guideLanguages: string | null; rating: number | string | null; reviewsNumber: number | null;
}

const jsonList = (raw: unknown): string[] => {
  try { const v = typeof raw === "string" ? JSON.parse(raw) : raw; return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
};
const ISO_LANG: Record<string, string> = { spanish: "es", espanol: "es", "español": "es", english: "en", es: "es", en: "en" };

export function tourToInput(t: TourRowForTaxonomy): ClassifyInput {
  const price = t.priceValue === null ? null : Number(t.priceValue);
  return {
    proveedor: "freetour",
    categoriaId: t.categoryId,
    precio: Number.isFinite(price) ? price : null,
    durationMinutes: t.durationMinutes,
    titulo: `${t.titleEs ?? t.titleEn ?? ""} | ${t.titleEn ?? ""}`,
    resumen: `${t.briefEs ?? ""} ${t.briefEn ?? ""}`,
    idiomas: jsonList(t.guideLanguages).map((l) => ISO_LANG[l.toLowerCase()] ?? l.toLowerCase()),
    calificacion: t.rating === null ? null : Number(t.rating),
    resenas: t.reviewsNumber ?? 0,
  };
}

export interface TripRowForTaxonomy {
  id: string; kind: string; category: string | null; durationDays: number | null; titleEs: string; titleEn: string;
  priceFrom: number | null; languages: string | null; options: string | null; flightsIncluded: number | boolean | null;
}

export function tripToInput(t: TripRowForTaxonomy): ClassifyInput {
  let modos: ("group" | "private")[] = [];
  try {
    const o = typeof t.options === "string" ? JSON.parse(t.options) : t.options;
    if (Array.isArray(o)) modos = o.map((x) => (x?.mode === "private" ? "private" : "group"));
  } catch { /* opciones ilegibles: sin modos */ }
  return {
    proveedor: "propios",
    categoriaId: t.kind,
    fuentesTema: t.category ? [t.category] : [],
    precio: t.priceFrom,
    durationDays: t.durationDays,
    titulo: `${t.titleEs} | ${t.titleEn}`,
    idiomas: jsonList(t.languages),
    modos,
    vueloIncluido: t.flightsIncluded === true || t.flightsIncluded === 1,
  };
}

export interface TaxonomyRow { experienceKind: "tour" | "trip"; experienceId: string; axis: "formato" | "tema" | "atributo" | "seccion"; term: string; ruleId: string }

/** Filas de una experiencia: formato, sección, temas y atributos, cada uno con la regla que lo decidió. */
export function rowsFor(kind: "tour" | "trip", id: string, r: ClassifyResult): TaxonomyRow[] {
  return [
    { experienceKind: kind, experienceId: id, axis: "formato", term: r.formato, ruleId: r.reglaFormato },
    { experienceKind: kind, experienceId: id, axis: "seccion", term: r.seccion, ruleId: `formato ${r.formato}` },
    ...r.reglasTemas.map((t) => ({ experienceKind: kind, experienceId: id, axis: "tema" as const, term: t.valor, ruleId: t.regla })),
    ...r.reglasAtributos.map((a) => ({ experienceKind: kind, experienceId: id, axis: "atributo" as const, term: a.valor, ruleId: a.regla })),
  ];
}

export interface RunCounts { formato: Record<string, number>; tema: Record<string, number>; total: number }

/** REQ-408: categorías sin mapear, desde la regla «sin mapeo: freetour:99» de las filas por-revisar. */
export function unmappedFrom(rules: { ruleId: string; n: number }[]): { provider: string; categoryId: string; tours: number }[] {
  return rules.flatMap(({ ruleId, n }) => {
    const m = /^sin mapeo: ([^:]+):(.+)$/.exec(ruleId);
    return m ? [{ provider: m[1], categoryId: m[2], tours: n }] : [];
  });
}

/** Barrera de cordura; null = se puede publicar. */
export function barrier(counts: RunCounts, previous: RunCounts | null): string | null {
  if (counts.total === 0) return "corrida vacía";
  const sinFormato = counts.formato["por-revisar"] ?? 0;
  if ((100 * sinFormato) / counts.total > MAX_UNCLASSIFIED_PCT) return `${sinFormato} de ${counts.total} sin formato (> ${MAX_UNCLASSIFIED_PCT} %)`;
  if (previous) {
    for (const [f, before] of Object.entries(previous.formato)) {
      if (f === "por-revisar" || before < MIN_FORMAT_FOR_DROP) continue;
      const now = counts.formato[f] ?? 0;
      if ((100 * (before - now)) / before > MAX_FORMAT_DROP_PCT) return `${f} cae de ${before} a ${now} (> ${MAX_FORMAT_DROP_PCT} %)`;
    }
  }
  return null;
}
