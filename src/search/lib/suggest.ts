/**
 * REQ-290…294: autocompletado agrupado y página de cero resultados con salida (plan S3, SEARCH_SUGGEST_ENABLED).
 * Puro: recibe el catálogo en memoria y lo que ya resolvió el buscador tolerante (S2) y devuelve ids; la raíz
 * (src/search/suggest.ts) pone nombres y títulos. Sin Intl, sin fechas, sin azar (INC-001).
 */
import { splitDestination, type CatalogEntry } from "@/catalog/lib/query";
import { CATEGORY_GROUPS, categoryGroupOf } from "@/tours/lib/extra-filters";
import { fold, foldTokens } from "./normalize";
import { STOPWORDS } from "./words";
import type { FuzzyResult } from "./fuzzy";

/** Baymard / Booking: desde 3 caracteres, debounce 250–300 ms, máx. 10 en escritorio y 4–8 en celular. */
export const MIN_CHARS = 3;
export const DEBOUNCE_MS = 250;
export const MAX_ITEMS_DESKTOP = 10;
export const MAX_ITEMS_MOBILE = 6;
export const MAX_DESTINATIONS = 4;
export const MAX_TOURS = 4;
export const MAX_CATEGORIES = 2;
export const MAX_QUERY_CHARS = 80;
/** Grupos que no se sugieren: «otros» no dice nada, «varios días» no tiene tours y el transporte no es un tour (REQ-172). */
const HIDDEN_GROUPS = new Set(["otros", "varios-dias", "transporte"]);

export interface DestinationHit { kind: "city" | "country"; id: number; count: number; corrected: boolean }
export interface CategoryHit { id: string; count: number }
export interface SuggestPlan {
  /** texto que se buscó (con alias y corrección de S2) */
  text: string;
  /** hubo alias o corrección: «Mostrando resultados de…» */
  corrected: boolean;
  /** «¿Quisiste decir…?»: destinos sugeridos que NO se aplicaron */
  didYouMean: DestinationHit[];
  destinations: DestinationHit[];
  tourIds: string[];
  categories: CategoryHit[];
}

/** Texto del usuario recortado y sin caracteres de control; null si no alcanza para sugerir. */
// REQ-290
export function cleanQuery(q: string | null | undefined): string | null {
  const s = (q ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_CHARS);
  return [...fold(s)].filter((c) => c !== " ").length >= MIN_CHARS ? s : null;
}

interface Dest { kind: "city" | "country"; id: number; names: string[]; count: number }
function destinationsOf(entries: CatalogEntry[]): Dest[] {
  const map = new Map<string, Dest>();
  const add = (kind: "city" | "country", id: number, names: string[] | undefined) => {
    const k = `${kind}:${id}`;
    const d = map.get(k);
    if (d) { d.count++; return; }
    map.set(k, { kind, id, names: [...new Set((names ?? []).map(fold).filter(Boolean))], count: 1 });
  };
  for (const e of entries) { add("city", e.cityId, e.cityNames); add("country", e.countryId, e.countryNames); }
  return [...map.values()];
}

const byCount = (a: DestinationHit, b: DestinationHit) =>
  Number(b.corrected) - Number(a.corrected) || b.count - a.count || (a.kind === b.kind ? a.id - b.id : a.kind === "city" ? -1 : 1);

/** Destinos que empiezan con lo escrito (o con alguna de sus palabras) y el destino corregido, si lo hubo. */
// REQ-290
export function suggestDestinations(entries: CatalogEntry[], resolved: FuzzyResult, max = MAX_DESTINATIONS): DestinationHit[] {
  const fq = fold(resolved.text);
  if (!fq) return [];
  const corrected = new Set(resolved.changes.map((c) => fold(c.to)));
  const out: DestinationHit[] = [];
  for (const d of destinationsOf(entries)) {
    const isCorrected = d.names.some((n) => corrected.has(n));
    const hit = isCorrected || d.names.some((n) => n.startsWith(fq) || n.includes(` ${fq}`) || (fq.includes(" ") && fq.startsWith(n)) || fq.split(" ").includes(n));
    if (hit) out.push({ kind: d.kind, id: d.id, count: d.count, corrected: isCorrected });
  }
  return out.sort(byCount).slice(0, max);
}

/** «¿Quisiste decir…?»: los destinos que S2 propuso sin aplicar. */
// REQ-291
export function didYouMean(entries: CatalogEntry[], resolved: FuzzyResult): DestinationHit[] {
  const wanted = (resolved.suggestions[0]?.options ?? []).map(fold);
  if (!wanted.length) return [];
  const dests = destinationsOf(entries);
  const out: DestinationHit[] = [];
  for (const w of wanted) {
    const d = dests.filter((x) => x.names.includes(w)).sort((a, b) => b.count - a.count)[0];
    if (d && !out.some((o) => o.kind === d.kind && o.id === d.id)) out.push({ kind: d.kind, id: d.id, count: d.count, corrected: false });
  }
  return out;
}

/** Tipos de actividad (los mismos filtros de /tours, REQ-051) cuyo nombre empieza con alguna palabra escrita. */
// REQ-290
export function suggestCategories(entries: CatalogEntry[], text: string, max = MAX_CATEGORIES): CategoryHit[] {
  const words = foldTokens(text).filter((w) => w.length >= MIN_CHARS && !STOPWORDS.has(w));
  if (!words.length) return [];
  const counts = new Map<string, number>();
  for (const e of entries) { const g = categoryGroupOf(e.categoryId); counts.set(g, (counts.get(g) ?? 0) + 1); }
  return CATEGORY_GROUPS
    .filter((g) => !HIDDEN_GROUPS.has(g.id) && (counts.get(g.id) ?? 0) > 0)
    .filter((g) => { const labelWords = new Set(Object.values(g.label).flatMap(foldTokens)); return words.some((w) => [...labelWords].some((l) => l.startsWith(w))); })
    .map((g) => ({ id: g.id, count: counts.get(g.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1))
    .slice(0, max);
}

/**
 * Ids de tours para el texto ya resuelto, por número de reseñas. Como /tours (destino dentro del texto, palabra
 * completa y luego inicio de palabra), pero SIN el último recurso de subcadena: una sugerencia con «rma» dentro de
 * «germany» confunde (hallazgo del ensayo del 6 nov 2026).
 */
// REQ-290
export function suggestTours(entries: CatalogEntry[], text: string, searchV2: boolean, max = MAX_TOURS): { ids: string[]; total: number } {
  const split = searchV2 ? splitDestination(entries, text) : null;
  const pool = split ? entries.filter(split.match) : entries;
  const all = foldTokens(split ? split.rest : text);
  const words = all.filter((w) => !STOPWORDS.has(w)).length ? all.filter((w) => !STOPWORDS.has(w)) : all;
  let hits = pool;
  if (words.length) {
    const tokens = (x: CatalogEntry) => x.text.split(/[^a-z0-9\u00c0-\uffff]+/);
    const whole = pool.filter((x) => { const t = new Set(tokens(x)); return words.every((w) => t.has(w)); });
    hits = whole.length ? whole : pool.filter((x) => { const t = tokens(x); return words.every((w) => t.some((k) => k.startsWith(w))); });
    if (!hits.length && split) hits = pool; // REQ-122: si el resto no encuentra nada en el destino, todo el destino
  } else if (!split) hits = [];
  const ids = [...hits].sort((a, b) => b.reviews - a.reviews || (a.id < b.id ? -1 : 1)).slice(0, max).map((x) => x.id);
  return { ids, total: hits.length };
}

// REQ-290 REQ-291
export function planSuggestions(entries: CatalogEntry[], resolved: FuzzyResult, searchV2: boolean): SuggestPlan {
  const destinations = suggestDestinations(entries, resolved);
  const tours = suggestTours(entries, resolved.text, searchV2);
  const categories = suggestCategories(entries, resolved.text);
  // tope total: los destinos primero, luego tours y categorías (máx. 10 en escritorio; el celular corta a 6 al pintar)
  const room = MAX_ITEMS_DESKTOP - destinations.length;
  const tourIds = tours.ids.slice(0, Math.min(MAX_TOURS, Math.max(0, room)));
  return {
    text: resolved.text, corrected: resolved.changes.length > 0, didYouMean: didYouMean(entries, resolved),
    destinations, tourIds, categories: categories.slice(0, Math.max(0, room - tourIds.length)),
  };
}

// ── Cero resultados (REQ-292) ─────────────────────────────────────────────────────────────────────────────────

export interface Alternative { query: string; total: number; tourIds: string[] }
export interface RecoveryPlan {
  alternatives: Alternative[];
  /** si solo una alternativa trae algo, se aplica sola (Baymard) */
  autoApply: string | null;
  didYouMean: DestinationHit[];
  popular: DestinationHit[];
  categories: CategoryHit[];
}
export const MAX_ALTERNATIVES = 3;
export const PREVIEW_TOURS = 3;
export const MAX_POPULAR = 6;

/** Búsquedas alternativas quitando una palabra a la vez (las palabras vacías no cuentan). */
// REQ-292
export function dropOneWord(text: string): string[] {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean);
  const content = words.filter((w) => !STOPWORDS.has(fold(w)));
  if (content.length < 2) return [];
  const out = new Set<string>();
  for (const w of content) {
    const alt = content.filter((x) => x !== w).join(" ");
    if (alt) out.add(alt);
  }
  return [...out];
}

// REQ-292
export function planRecovery(entries: CatalogEntry[], resolved: FuzzyResult, searchV2: boolean): RecoveryPlan {
  const alternatives = dropOneWord(resolved.text)
    .map((query) => { const r = suggestTours(entries, query, searchV2, PREVIEW_TOURS); return { query, total: r.total, tourIds: r.ids }; })
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total || (a.query < b.query ? -1 : 1))
    .slice(0, MAX_ALTERNATIVES);
  const popular = destinationsOf(entries).filter((d) => d.kind === "city")
    .map((d) => ({ kind: d.kind, id: d.id, count: d.count, corrected: false }))
    .sort(byCount).slice(0, MAX_POPULAR);
  const counts = new Map<string, number>();
  for (const e of entries) { const g = categoryGroupOf(e.categoryId); counts.set(g, (counts.get(g) ?? 0) + 1); }
  const categories = CATEGORY_GROUPS.filter((g) => !HIDDEN_GROUPS.has(g.id) && (counts.get(g.id) ?? 0) > 0)
    .map((g) => ({ id: g.id, count: counts.get(g.id)! })).sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1)).slice(0, 4);
  return { alternatives, autoApply: alternatives.length === 1 ? alternatives[0].query : null, didYouMean: didYouMean(entries, resolved), popular, categories };
}

// ── Presentación (puro, para el cliente) ──────────────────────────────────────────────────────────────────────

export interface Segment { text: string; strong: boolean }

/** Pliega letra por letra sin cambiar posiciones (para resaltar sobre el texto original). */
const foldChar = (c: string) => fold(c) || (c === " " ? " " : "");

/**
 * REQ-290: resalta lo que el usuario NO escribió (Baymard): la parte que coincide va normal y el resto en negritas.
 * Se busca lo escrito al inicio de una palabra del nombre, sin acentos ni mayúsculas.
 */
// REQ-290
export function highlight(label: string, typed: string): Segment[] {
  const chars = [...label];
  const folded = chars.map(foldChar);
  const q = fold(typed);
  if (!q) return [{ text: label, strong: false }];
  // posiciones de inicio en el texto plegado
  let flat = "";
  const start: number[] = [];
  folded.forEach((f, i) => { start.push(flat.length); flat += f; });
  let at = -1;
  for (let i = 0; i < chars.length; i++) {
    const wordStart = i === 0 || !/[\p{L}\p{N}]/u.test(chars[i - 1]);
    if (wordStart && flat.startsWith(q, start[i])) { at = i; break; }
  }
  if (at < 0) return [{ text: label, strong: true }];
  let end = at, len = 0;
  while (end < chars.length && len < q.length) { len += folded[end].length; end++; }
  const segs: Segment[] = [
    { text: chars.slice(0, at).join(""), strong: true },
    { text: chars.slice(at, end).join(""), strong: false },
    { text: chars.slice(end).join(""), strong: true },
  ];
  return segs.filter((s) => s.text);
}

/** REQ-293: flechas, Inicio/Fin y Escape sobre la lista (-1 = el cuadro de texto). */
// REQ-293
export function nextActive(active: number, key: string, count: number): number {
  if (count <= 0) return -1;
  switch (key) {
    case "ArrowDown": return active + 1 >= count ? 0 : active + 1;
    case "ArrowUp": return active <= 0 ? count - 1 : active - 1;
    case "Home": return 0;
    case "End": return count - 1;
    case "Escape": return -1;
    default: return active;
  }
}
