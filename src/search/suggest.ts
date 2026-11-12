/**
 * REQ-290…292: autocompletado y recuperación de cero resultados (I/O). Tras SEARCH_SUGGEST_ENABLED (apagado).
 * Recibe sus dependencias por parámetro (DIP): las rutas /api/search/* le pasan el catálogo y los nombres reales.
 * Nombres y títulos se validan con Zod; un registro malo se descarta y se registra, no tumba la respuesta.
 */
import { z } from "zod";
import type { CatalogEntry } from "@/catalog/lib/query";
import { groupLabel } from "@/tours/lib/extra-filters";
import { suggestTrips, type TripSuggestEntry } from "./lib/suggest";
import { isSearchV2 } from "./lib/fts-query";
import { cleanQuery, planRecovery, planSuggestions, type DestinationHit } from "./lib/suggest";
import { categoryHref, searchHref, suggestCopy, tourCount, tourHref, whatsappHref } from "./lib/suggest-copy";
import { fuzzySearch, isSearchFuzzy } from "./fuzzy";
import type { FuzzyResult } from "./lib/fuzzy";

/** Interruptor SEARCH_SUGGEST_ENABLED (apagado por defecto). */
export const isSearchSuggest = (v: string | undefined) => v === "true";

export interface SuggestEnv { SEARCH_SUGGEST_ENABLED?: string; SEARCH_V2_ENABLED?: string; SEARCH_FUZZY_ENABLED?: string }
export interface SuggestDeps {
  loadCatalog(language: string): Promise<CatalogEntry[]>;
  /** REQ-1615: viajes propios y de agencia publicados (opcional; sin él, el autocompletado no los sugiere). */
  loadTrips?(language: string): Promise<TripSuggestEntry[]>;
  /** traducciones crudas (JSON de City/Country/TourTranslation), por id */
  cityTranslations(ids: number[]): Promise<{ id: number; translations: unknown }[]>;
  countryTranslations(ids: number[]): Promise<{ id: number; translations: unknown }[]>;
  tourTitles(ids: string[], language: string): Promise<{ tourId: string; language: string; title: unknown }[]>;
  /** REQ-354: filas de destino_alias (vacío si la tabla no existe) */
  dbAliases?(): Promise<readonly unknown[]>;
  env: SuggestEnv;
}

export type SuggestGroup = "didYouMean" | "destination" | "tour" | "trip" | "category";
export interface SuggestItem { group: SuggestGroup; label: string; href: string; hint?: string }
export interface SuggestResponse { q: string; corrected: boolean; correctedLabel: string | null; items: SuggestItem[] }
export interface RecoverResponse {
  q: string; autoApply: string | null;
  didYouMean: SuggestItem[];
  alternatives: { query: string; href: string; total: number; hint: string; tours: SuggestItem[] }[];
  popular: SuggestItem[]; categories: SuggestItem[]; whatsapp: string;
}

const Translations = z.record(z.string(), z.string());
function pickName(raw: unknown, language: string): string | null {
  let v: unknown = raw;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { return null; } }
  const t = Translations.safeParse(v);
  if (!t.success) return null;
  const name = t.data[language] || t.data.es || t.data.en || Object.values(t.data)[0];
  return name && name.trim() ? name.trim() : null;
}

async function labelsFor(deps: SuggestDeps, hits: DestinationHit[], language: string): Promise<Map<string, string>> {
  const cities = [...new Set(hits.filter((h) => h.kind === "city").map((h) => h.id))];
  const countries = [...new Set(hits.filter((h) => h.kind === "country").map((h) => h.id))];
  const [cs, ks] = await Promise.all([cities.length ? deps.cityTranslations(cities) : [], countries.length ? deps.countryTranslations(countries) : []]);
  const out = new Map<string, string>();
  let bad = 0;
  for (const r of cs) { const n = pickName(r.translations, language); if (n) out.set(`city:${r.id}`, n); else bad++; }
  for (const r of ks) { const n = pickName(r.translations, language); if (n) out.set(`country:${r.id}`, n); else bad++; }
  if (bad) console.error(`[busqueda] ${bad} nombre(s) de destino inválido(s) descartado(s)`);
  return out;
}

async function titlesFor(deps: SuggestDeps, ids: string[], language: string): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await deps.tourTitles(ids, language);
  const out = new Map<string, string>();
  for (const r of rows) {
    const t = z.string().min(1).max(300).safeParse(r.title);
    if (!t.success) continue;
    if (r.language === language || !out.has(r.tourId)) out.set(r.tourId, t.data);
  }
  return out;
}

async function resolve(deps: SuggestDeps, entries: CatalogEntry[], q: string): Promise<FuzzyResult> {
  const on = isSearchV2(deps.env.SEARCH_V2_ENABLED) && isSearchFuzzy(deps.env.SEARCH_FUZZY_ENABLED);
  const rows = on && deps.dbAliases ? await deps.dbAliases() : undefined;
  return fuzzySearch(entries, q, on, rows) ?? { text: q, changes: [], suggestions: [] };
}

const destItem = (group: SuggestGroup, h: DestinationHit, labels: Map<string, string>, language: string): SuggestItem | null => {
  const label = labels.get(`${h.kind}:${h.id}`);
  return label ? { group, label, href: searchHref(label), hint: tourCount(suggestCopy(language), h.count) } : null;
};

// REQ-290 REQ-291
export async function suggestFor(deps: SuggestDeps, rawQ: string | null, language: string): Promise<SuggestResponse | null> {
  if (!isSearchSuggest(deps.env.SEARCH_SUGGEST_ENABLED)) return null;
  const q = cleanQuery(rawQ);
  if (!q) return { q: rawQ ?? "", corrected: false, correctedLabel: null, items: [] };
  const entries = await deps.loadCatalog(language);
  const resolved = await resolve(deps, entries, q);
  const plan = planSuggestions(entries, resolved, isSearchV2(deps.env.SEARCH_V2_ENABLED));
  // REQ-1615: los viajes de agencia también se sugieren (catálogo único, REQ-1605); si fallan, no tumban el resto.
  const [labels, titles, trips] = await Promise.all([
    labelsFor(deps, [...plan.didYouMean, ...plan.destinations], language),
    titlesFor(deps, plan.tourIds, language),
    deps.loadTrips ? deps.loadTrips(language).catch((error) => { console.error("[suggest] sin viajes:", error); return [] as TripSuggestEntry[]; }) : Promise.resolve([] as TripSuggestEntry[]),
  ]);
  const items: SuggestItem[] = [
    ...plan.didYouMean.map((h) => destItem("didYouMean", h, labels, language)),
    ...plan.destinations.map((h) => destItem("destination", h, labels, language)),
    ...plan.tourIds.map((id): SuggestItem | null => (titles.has(id) ? { group: "tour", label: titles.get(id)!, href: tourHref(id) } : null)),
    ...suggestTrips(trips, q).map((t): SuggestItem => ({ group: "trip", label: t.title, href: t.path })), // REQ-1615
    ...plan.categories.map((c): SuggestItem => ({ group: "category", label: groupLabel(c.id, language), href: categoryHref(c.id), hint: tourCount(suggestCopy(language), c.count) })),
  ].filter((x): x is SuggestItem => !!x);
  const first = plan.destinations.find((d) => d.corrected);
  return { q, corrected: plan.corrected, correctedLabel: first ? labels.get(`${first.kind}:${first.id}`) ?? null : null, items };
}

// REQ-292
export async function recoverFor(deps: SuggestDeps, rawQ: string | null, language: string): Promise<RecoverResponse | null> {
  if (!isSearchSuggest(deps.env.SEARCH_SUGGEST_ENABLED)) return null;
  const q = (rawQ ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!q) return null;
  const entries = await deps.loadCatalog(language);
  const resolved = await resolve(deps, entries, q);
  const plan = planRecovery(entries, resolved, isSearchV2(deps.env.SEARCH_V2_ENABLED));
  const tourIds = plan.alternatives.flatMap((a) => a.tourIds);
  const [labels, titles] = await Promise.all([labelsFor(deps, [...plan.didYouMean, ...plan.popular], language), titlesFor(deps, tourIds, language)]);
  const c = suggestCopy(language);
  return {
    q, autoApply: plan.autoApply,
    didYouMean: plan.didYouMean.map((h) => destItem("didYouMean", h, labels, language)).filter((x): x is SuggestItem => !!x),
    alternatives: plan.alternatives.map((a) => ({
      query: a.query, href: searchHref(a.query), total: a.total, hint: tourCount(c, a.total),
      tours: a.tourIds.filter((id) => titles.has(id)).map((id) => ({ group: "tour" as const, label: titles.get(id)!, href: tourHref(id) })),
    })),
    popular: plan.popular.map((h) => destItem("destination", h, labels, language)).filter((x): x is SuggestItem => !!x),
    categories: plan.categories.map((k) => ({ group: "category" as const, label: groupLabel(k.id, language), href: categoryHref(k.id), hint: tourCount(c, k.count) })),
    whatsapp: whatsappHref(language, q),
  };
}
