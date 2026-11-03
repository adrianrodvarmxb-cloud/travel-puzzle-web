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

export type ToursKindFilter = "all" | "free" | "tour" | "circuito" | "unica";
export const OWN_KIND_FILTERS = ["tour", "circuito", "unica"] as const;
export const isOwnKindFilter = (k: string): k is (typeof OWN_KIND_FILTERS)[number] => (OWN_KIND_FILTERS as readonly string[]).includes(k);

/** ¿Va este viaje arriba de los resultados de /tours con este filtro? */
export function matchesToursFilter(t: { countries: string[]; kind: TripKind }, f: { countryCode: string | null; kind: ToursKindFilter }): boolean {
  if (f.kind === "free") return false;
  if (f.kind !== "all" && t.kind !== f.kind) return false;
  return !f.countryCode || t.countries.includes(f.countryCode);
}
