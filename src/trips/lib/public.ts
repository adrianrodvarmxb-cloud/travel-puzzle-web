/** Lo público de los viajes: URL (gate K) y mezcla en /tours (gate L). Puro. */
import { continentOf, countryName } from "./geo";
import type { TripKind } from "./trip";

const slugText = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const CONTINENT_SLUG: Record<string, string> = { LAT: "latinoamerica", NAM: "norteamerica", EUR: "europa", ASI: "asia", AFR: "africa", OCE: "oceania" };

/** Destino de la URL: el país si es uno; el continente si todos son del mismo; si no, "mundo". */
export function destinationSlug(countries: string[]): string {
  if (countries.length === 1) return slugText(countryName(countries[0], "es"));
  const set = new Set(countries.map(continentOf));
  const only = [...set][0];
  return countries.length && set.size === 1 && only ? CONTINENT_SLUG[only] : "mundo";
}

export function tripPath(t: { slug: string; countries: string[] }): string {
  return `/viajes/${destinationSlug(t.countries)}/${t.slug}`;
}

export type ToursKindFilter = "all" | "free" | "tour" | "circuito" | "unica" | "transporte";
export const OWN_KIND_FILTERS = ["tour", "circuito", "unica", "transporte"] as const;
export const isOwnKindFilter = (k: string): k is (typeof OWN_KIND_FILTERS)[number] => (OWN_KIND_FILTERS as readonly string[]).includes(k);

/** Chips de /tours: "todo" y "free" siempre; de los propios, solo los tipos que existen. */
export function visibleKindFilters(kinds: string[]): ToursKindFilter[] {
  return ["all", "free", ...OWN_KIND_FILTERS.filter((k) => kinds.includes(k))];
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export interface ToursFilter {
  countryCode: string | null;
  kind: ToursKindFilter;
  /** REQ-046: texto del buscador (todas las palabras, sin acentos). */
  search?: string;
  /** REQ-046: nombre de la ciudad elegida en el filtro. */
  cityName?: string | null;
  minPrice?: number;
  maxPrice?: number;
}
type FilterableTrip = { countries: string[]; kind: TripKind; title?: string; summary?: string; cities?: string[]; places?: string; priceFrom?: number | null };

/** ¿Va este viaje arriba de los resultados de /tours con este filtro? REQ-046: respeta buscador, ciudad y precio. */
export function matchesToursFilter(t: FilterableTrip, f: ToursFilter): boolean {
  if (f.kind === "free") return false;
  if (f.kind !== "all" && t.kind !== f.kind) return false;
  if (f.countryCode && !t.countries.includes(f.countryCode)) return false;
  if (f.cityName && !(t.cities ?? []).some((c) => fold(c) === fold(f.cityName!))) return false;
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    const p = t.priceFrom;
    if (p == null) return false;
    if (f.minPrice !== undefined && p < f.minPrice) return false;
    if (f.maxPrice !== undefined && p > f.maxPrice) return false;
  }
  const words = fold(f.search ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold([t.title, t.summary, ...(t.cities ?? []), t.places, ...t.countries].filter(Boolean).join(" "));
  return words.every((w) => hay.includes(w));
}
