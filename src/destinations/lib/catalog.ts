/**
 * Árbol de destinos (países → ciudades → tours) a partir de las filas de D1. Puro: el repositorio
 * (src/destinations/repository.ts) lee la base y la página recibe este modelo. Sin código por país.
 *
 * Reglas:
 * - Un país entra solo con ISO-2 guardado (su slug es el ISO-2 en minúsculas). Una ciudad, solo con slug.
 *   Un tour, solo con slug, activo y no removed. Lo que no tiene slug (hoy, todo en producción) no aparece.
 * - Los viajes propios publicados (tabla Trip, gate 4) entran a la sección Tours de su ciudad.
 * - Indexación: cityMeetsRule + la gracia de 14 días con el estado guardado (REQ-089/090/091).
 */
import { cityName } from "./dry-run";
import { cityHasPage, cityMeetsRule, countryIndexable, nextCityIndexState } from "./indexing";
import { cityPath, countryPath, tourPath, type TourStatus } from "./routes";

export interface CountryRow { id: number; code: string; iso2: string | null; translations: unknown }
export interface CityRow {
  id: number;
  countryId: number;
  translations: unknown;
  slug: string | null;
  guide: string | null;
  guideUpdatedAt: string | null;
  indexableSince: string | null;
  failingSince: string | null;
}
export interface TourRow {
  id: string;
  externalId: number;
  slug: string | null;
  cityId: number;
  countryId: number;
  title: string;
  provider: string | null;
  price: number;
  currency: string;
  rating: number | null;
  reviews: number;
  image: string | null;
  duration: string | null;
  status: TourStatus;
  isActive: boolean;
  updatedAt: string;
}
/** Viaje propio publicado: países ISO-2 y ciudades por nombre, tal como se capturan en el gestor. */
export interface TripRow { id: string; slug: string; title: string; image: string | null; countries: string[]; cities: string[]; priceLabel: string | null; updatedAt: string }

export interface TourCardModel {
  id: string;
  href: string;
  title: string;
  provider: string | null;
  image: string | null;
  isFreeTour: boolean;
  price: number;
  currency: string;
  rating: number | null;
  reviews: number;
  duration: string | null;
  kind: "free" | "paid" | "own";
  priceLabel?: string | null;
  updatedAt: string;
}

export interface CityNode {
  id: number;
  slug: string;
  name: string;
  href: string;
  guide: string | null;
  guideUpdatedAt: string | null;
  activeTours: number;
  indexed: boolean;
  freeTours: TourCardModel[];
  paidTours: TourCardModel[];
  ownTrips: TourCardModel[];
}
export interface CountryNode { id: number; iso2: string; slug: string; name: string; href: string; indexable: boolean; cities: CityNode[] }

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function names(translations: unknown): string[] {
  let t: unknown = translations;
  if (typeof t === "string") { try { t = JSON.parse(t); } catch { t = null; } }
  if (!t || typeof t !== "object") return [];
  return Object.values(t as Record<string, unknown>).filter((v): v is string => typeof v === "string" && !!v.trim()).map(fold);
}

/** Nombre visible de un país o ciudad: español, luego inglés, luego el primero; si no hay, el respaldo. */
export function placeName(translations: unknown, fallback = ""): string {
  return cityName(translations) || fallback;
}

/** ¿Este tour se publica en /destinos? Con slug, activo y no removed (missing sigue sirviéndose). */
// REQ-088
export function isListed(t: Pick<TourRow, "slug" | "isActive" | "status">): boolean {
  return !!t.slug && SLUG.test(t.slug) && t.isActive && t.status !== "removed";
}

export function tourCard(t: TourRow, countrySlug: string, citySlug: string): TourCardModel {
  const isFreeTour = Number(t.price) === 0;
  return {
    id: t.id, href: tourPath(countrySlug, citySlug, t.slug!), title: t.title, provider: t.provider, image: t.image,
    isFreeTour, price: Number(t.price), currency: t.currency, rating: t.rating, reviews: t.reviews, duration: t.duration,
    kind: isFreeTour ? "free" : "paid", updatedAt: t.updatedAt,
  };
}

const byReviews = (a: TourCardModel, b: TourCardModel) => b.reviews - a.reviews || Number(b.rating ?? 0) - Number(a.rating ?? 0) || a.title.localeCompare(b.title, "es");

export interface TreeInput {
  countries: CountryRow[];
  cities: CityRow[];
  tours: TourRow[];
  trips: TripRow[];
  now: Date;
}

/**
 * REQ-088…091: países y ciudades con página, cada ciudad con sus secciones e indexación.
 * Una ciudad sin tours no tiene página (no aparece); un país sin ciudades con página tampoco.
 */
// REQ-088 REQ-089 REQ-090 REQ-091
export function destinationTree({ countries, cities, tours, trips, now }: TreeInput): CountryNode[] {
  const out: CountryNode[] = [];
  const toursByCity = new Map<number, TourRow[]>();
  for (const t of tours) if (isListed(t)) toursByCity.set(t.cityId, [...(toursByCity.get(t.cityId) ?? []), t]);

  for (const c of countries) {
    const iso2 = (c.iso2 ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso2)) continue;
    const slug = iso2.toLowerCase();
    const nodes: CityNode[] = [];
    for (const city of cities.filter((x) => x.countryId === c.id && x.slug && SLUG.test(x.slug))) {
      const citySlug = city.slug!;
      const mine = (toursByCity.get(city.id) ?? []).map((t) => tourCard(t, slug, citySlug));
      const own = trips
        .filter((tr) => SLUG.test(tr.slug) && tripInCity(tr, iso2, city.translations))
        .map((tr): TourCardModel => ({
          id: tr.id, href: tourPath(slug, citySlug, tr.slug), title: tr.title, provider: null, image: tr.image, isFreeTour: false,
          price: 0, currency: "", rating: null, reviews: 0, duration: null, kind: "own", priceLabel: tr.priceLabel, updatedAt: tr.updatedAt,
        }));
      const activeTours = mine.length + own.length;
      if (!cityHasPage(activeTours)) continue;
      const meets = cityMeetsRule({ activeTours, guide: city.guide });
      const indexed = nextCityIndexState({ indexed: !!city.indexableSince, failingSince: city.failingSince }, meets, now).indexed;
      nodes.push({
        id: city.id, slug: citySlug, name: placeName(city.translations, citySlug), href: cityPath(slug, citySlug), guide: city.guide,
        guideUpdatedAt: city.guideUpdatedAt, activeTours, indexed,
        freeTours: mine.filter((t) => t.isFreeTour).sort(byReviews),
        paidTours: mine.filter((t) => !t.isFreeTour).sort(byReviews),
        ownTrips: own,
      });
    }
    if (!nodes.length) continue;
    nodes.sort((a, b) => b.activeTours - a.activeTours || a.name.localeCompare(b.name, "es"));
    out.push({ id: c.id, iso2, slug, name: placeName(c.translations, iso2), href: countryPath(slug), indexable: countryIndexable(nodes), cities: nodes });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** ¿El viaje propio es de esta ciudad? País ISO-2 y nombre de ciudad (sin acentos ni mayúsculas, en cualquier idioma). */
function tripInCity(trip: Pick<TripRow, "countries" | "cities">, iso2: string, cityTranslations: unknown): boolean {
  const cityNames = new Set(names(cityTranslations));
  return trip.countries.map((x) => x.toUpperCase()).includes(iso2.toUpperCase()) && trip.cities.some((n) => cityNames.has(fold(n)));
}

// REQ-092 (gate 4): a qué ciudad de /destinos entra un viaje propio (el primer país y ciudad que coincidan).
export function ownTripPlace(trip: Pick<TripRow, "slug" | "countries" | "cities">, cities: readonly (CityRow & { iso2: string })[]): { countrySlug: string; citySlug: string; slug: string } | null {
  if (!SLUG.test(trip.slug)) return null;
  const city = cities.find((c) => c.slug && SLUG.test(c.slug) && tripInCity(trip, c.iso2, c.translations));
  return city ? { countrySlug: city.iso2.toLowerCase(), citySlug: city.slug!, slug: trip.slug } : null;
}

export function findCountry(tree: CountryNode[], pais: string): CountryNode | null {
  return tree.find((c) => c.slug === pais) ?? null;
}

export function findCity(tree: CountryNode[], pais: string, ciudad: string): { country: CountryNode; city: CityNode } | null {
  const country = findCountry(tree, pais);
  const city = country?.cities.find((c) => c.slug === ciudad);
  return country && city ? { country, city } : null;
}

export const allTours = (city: CityNode) => [...city.freeTours, ...city.paidTours, ...city.ownTrips];
