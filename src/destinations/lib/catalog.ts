/**
 * Árbol de destinos (países → ciudades → tours) a partir de las filas de D1. Puro: el repositorio
 * (src/destinations/repository.ts) lee la base y la página recibe este modelo. Sin código por país.
 *
 * Reglas:
 * - Un país entra solo con ISO-2 guardado (su slug es el ISO-2 en minúsculas). Una ciudad, solo con slug.
 *   Un tour, solo con slug, activo y no removed. Lo que no tiene slug (hoy, todo en producción) no aparece.
 * - Los viajes propios publicados (tabla Trip, gate 4) entran a la sección Tours de su ciudad.
 * - Indexación: cityMeetsRule + la gracia de 14 días con el estado guardado (REQ-089/090/091); solo cuentan los tours
 *   indexables (REQ-1200) y la guía propia indexa por sí sola (REQ-1201).
 */
import { cityName } from "./dry-run";
import { countryIso2, countryTranslations } from "./ids";
import { cityHasPage, cityMeetsRule, countryIndexable, nextCityIndexState } from "./indexing";
import { indexableProvider } from "@/seo/lib/enrichment";
import { cityPath, countryPath, tourPath, type TourStatus } from "./routes";
import { isPublishable, ownKindFormato, type CatalogClassifier } from "@/taxonomy/lib/publish";
import { catalogTourFormat, tripFormat } from "@/tours/lib/card-format";

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
  /** T3 y REQ-522: categoría y duración del proveedor, para el clasificador de la taxonomía y la categoría de la tarjeta. */
  categoryId?: number | null;
  durationMinutes?: number | null;
  /** REQ-662/REQ-665 (Gate 3): título del proveedor en inglés ("" o null = no hay). */
  titleEn?: string | null;
  /** REQ-831: proveedor de la fila (Tour.providerId; en la base el valor por defecto es "freetour"). */
  providerId?: string | null;
}
/** Viaje propio publicado: países ISO-2 y ciudades por nombre, tal como se capturan en el gestor. */
export interface TripRow {
  id: string; slug: string; /** REQ-172: "transporte" va a Traslados, no a Tours. */ kind?: string; title: string; image: string | null; countries: string[]; cities: string[]; priceLabel: string | null; updatedAt: string;
  /** REQ-524: agencia (null = Travel Puzzle). REQ-523: días y resumen. Opcionales. */
  agency?: string | null; agencyId?: string | null; durationDays?: number | null; summary?: string | null; priceFrom?: number | null;
  /** REQ-662/REQ-665: título en inglés del gestor ("" = sin traducir). */
  titleEn?: string | null;
}

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
  /** T3/T5 y REQ-522: formato de la taxonomía (el de T3 si está encendida; si no, el mismo clasificador por defecto). */
  formato?: string;
  /** T5: si hay guía en persona (solo con TAXONOMY_PUBLISH_ENABLED). */
  guiaEnPersona?: boolean;
  /** REQ-544: atributos de la taxonomía (chips de la ficha), con TAXONOMY_PUBLISH_ENABLED. */
  atributos?: string[];
  /** REQ-523: ciudad, días y resumen para la tarjeta única. */
  city?: string | null;
  durationDays?: number | null;
  summary?: string | null;
  /** REQ-662/REQ-665: título en inglés (del proveedor o del gestor); vacío = la ficha no tiene versión indexable en inglés. */
  titleEn?: string | null;
  /** REQ-831: proveedor del tour del catálogo (para robots y sitemap). Los viajes no lo llevan: siempre se indexan. */
  providerId?: string;
}

export interface CityNode {
  id: number;
  slug: string;
  name: string;
  href: string;
  guide: string | null;
  guideUpdatedAt: string | null;
  activeTours: number;
  /** REQ-1200: tours activos de proveedores con permiso de indexar (viajes propios y de agencia siempre cuentan). */
  indexableTours: number;
  indexed: boolean;
  freeTours: TourCardModel[];
  paidTours: TourCardModel[];
  ownTrips: TourCardModel[];
  /** REQ-172: viajes de tipo transporte (Big Bus…): sección Traslados de la ciudad, no Tours. */
  transportTrips: TourCardModel[];
  /** REQ-665: nombre por idioma (traducciones de la base). */
  names?: Record<string, string>;
  /** REQ-1262: «Experiencias en línea» de la ciudad: tienen ficha, pero no se listan ni cuentan para indexar. */
  onlineTours?: TourCardModel[];
}
export interface CountryNode { id: number; iso2: string; slug: string; name: string; href: string; indexable: boolean; cities: CityNode[]; /** REQ-665 */ names?: Record<string, string> }

/** REQ-665: traducciones de un país o ciudad como mapa idioma → nombre (solo textos no vacíos). */
export function placeNames(translations: unknown): Record<string, string> {
  let t: unknown = translations;
  if (typeof t === "string") { try { t = JSON.parse(t); } catch { t = null; } }
  if (!t || typeof t !== "object") return {};
  return Object.fromEntries(Object.entries(t as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string" && !!e[1].trim()).map(([k, v]) => [k, v.trim()]));
}

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

export function tourCard(t: TourRow, countrySlug: string, citySlug: string, taxonomy?: CatalogClassifier, cityName: string | null = null): TourCardModel {
  // REQ-406 (T3, tras TAXONOMY_PUBLISH_ENABLED): Free tour = formato pieza-libre; apagada, precio 0 como hoy.
  // REQ-1253: con el nombre de la ciudad base (un «Viaje de 1 día» que la nombra y no sale se queda en la ciudad).
  const ct = cityName ? { ...t, cities: [cityName] } : t;
  const cls = taxonomy?.(ct);
  const isFreeTour = cls ? cls.formato === "pieza-libre" : Number(t.price) === 0;
  // REQ-522: con T3 apagada la tarjeta usa el mismo clasificador por defecto (sin guiaEnPersona, que es de T5).
  const formato = cls?.formato ?? (t.categoryId === undefined || t.categoryId === null ? undefined : catalogTourFormat({ categoryId: t.categoryId, price: t.price, durationMinutes: t.durationMinutes ?? null, titles: [t.title], cities: cityName ? [cityName] : undefined }));
  return {
    ...(cls && { guiaEnPersona: cls.guiaEnPersona, atributos: cls.atributos ?? [] }),
    ...(formato && { formato }),
    id: t.id, href: tourPath(countrySlug, citySlug, t.slug!), title: t.title, provider: t.provider, image: t.image,
    isFreeTour, price: Number(t.price), currency: t.currency, rating: t.rating, reviews: t.reviews, duration: t.duration,
    kind: isFreeTour ? "free" : "paid", updatedAt: t.updatedAt,
    city: cityName, // REQ-523
    ...(t.titleEn !== undefined && { titleEn: t.titleEn ?? null }), // REQ-662
    providerId: t.providerId?.trim() || "freetour", // REQ-831: sin dato, el valor por defecto de la base
  };
}

/** REQ-524: un viaje sin agencia es de Travel Puzzle (REQ-148). */
const tripProvider = (tr: TripRow) => (tr.agencyId ? tr.agency?.trim() || null : tr.agency === undefined ? null : "Travel Puzzle");

const byReviews = (a: TourCardModel, b: TourCardModel) => b.reviews - a.reviews || Number(b.rating ?? 0) - Number(a.rating ?? 0) || a.title.localeCompare(b.title, "es");

export interface TreeInput {
  countries: CountryRow[];
  cities: CityRow[];
  tours: TourRow[];
  trips: TripRow[];
  now: Date;
  /** T3: con TAXONOMY_PUBLISH_ENABLED, el clasificador de la taxonomía; sin él, todo igual que hoy. */
  taxonomy?: CatalogClassifier;
}

/**
 * REQ-088…091: países y ciudades con página, cada ciudad con sus secciones e indexación.
 * Una ciudad sin tours no tiene página (no aparece); un país sin ciudades con página tampoco.
 */
// REQ-088 REQ-089 REQ-090 REQ-091
export function destinationTree({ countries, cities, tours, trips, now, taxonomy }: TreeInput): CountryNode[] {
  const out: CountryNode[] = [];
  const toursByCity = new Map<number, TourRow[]>();
  // REQ-407 / REQ-408 (T3): fuera y por-revisar no se publican ni cuentan para indexar la ciudad.
  const publishable = (t: TourRow) => !taxonomy || isPublishable(taxonomy(t).formato);
  // REQ-261 (T3): traslados y transporte de FREETOUR van a la sección Traslados de la ciudad, no a Tours.
  const inTransfers = (t: TourRow) => !!taxonomy && taxonomy(t).seccion === "traslados";
  for (const t of tours) if (isListed(t) && publishable(t)) toursByCity.set(t.cityId, [...(toursByCity.get(t.cityId) ?? []), t]);
  // REQ-1262: las experiencias en línea solo dan ficha (sin sección, sin conteo, sin sitemap).
  const onlineByCity = new Map<number, TourRow[]>();
  if (taxonomy) for (const t of tours) if (isListed(t) && taxonomy(t).formato === "en-linea") onlineByCity.set(t.cityId, [...(onlineByCity.get(t.cityId) ?? []), t]);

  // REQ-1264: un solo país por ISO-2 (Escocia, Irlanda del Norte y Gales cuelgan de GB); el nombre es el de la fila ISO.
  const groups = new Map<string, CountryRow[]>();
  for (const c of countries) {
    const iso = countryIso2(c);
    if (iso) groups.set(iso, [...(groups.get(iso) ?? []), c]);
  }
  for (const [iso2, rows] of groups) {
    const c = rows.find((r) => (r.iso2 ?? "").trim().toUpperCase() === iso2) ?? rows[0];
    const ids = new Set(rows.map((r) => r.id));
    const slug = iso2.toLowerCase();
    const nodes: CityNode[] = [];
    for (const city of cities.filter((x) => ids.has(x.countryId) && x.slug && SLUG.test(x.slug))) {
      const citySlug = city.slug!;
      const cityLabel = placeName(city.translations, citySlug);
      const listed = toursByCity.get(city.id) ?? [];
      const mine = listed.filter((t) => !inTransfers(t)).map((t) => tourCard(t, slug, citySlug, taxonomy, cityLabel));
      const freetourTransfers = listed.filter(inTransfers).map((t) => tourCard(t, slug, citySlug, taxonomy, cityLabel));
      const here = trips
        .filter((tr) => SLUG.test(tr.slug) && tripInCity(tr, iso2, city.translations))
        .map((tr): TourCardModel => ({
          id: tr.id, href: tourPath(slug, citySlug, tr.slug), title: tr.title, provider: tripProvider(tr), image: tr.image, isFreeTour: false,
          price: 0, currency: "", rating: null, reviews: 0, duration: null, kind: "own", priceLabel: tr.priceLabel, updatedAt: tr.updatedAt,
          // REQ-522: el formato del viaje sale del clasificador oficial (como T4 en /tours); T5 conserva guiaEnPersona.
          ...(tr.kind ? { formato: tripFormat({ kind: tr.kind, priceFrom: tr.priceFrom ?? null, durationDays: tr.durationDays ?? null, titles: [tr.title], resumen: tr.summary ?? null }) } : taxonomy ? { formato: ownKindFormato(tr.kind) } : {}),
          ...(taxonomy && { guiaEnPersona: tr.kind !== "transporte" }),
          city: cityLabel, durationDays: tr.durationDays ?? null, summary: tr.summary ?? null, // REQ-523
          ...(tr.titleEn !== undefined && { titleEn: tr.titleEn ?? null }), // REQ-662
        }));
      // REQ-172: el transporte no es un tour; cuenta para que la ciudad tenga página, pero se lista en Traslados.
      const transportIds = new Set(trips.filter((tr) => tr.kind === "transporte").map((tr) => tr.id));
      const own = here.filter((t) => !transportIds.has(t.id));
      const transport = here.filter((t) => transportIds.has(t.id));
      const activeTours = mine.length + freetourTransfers.length + here.length;
      if (!cityHasPage(activeTours)) continue;
      // REQ-1200 REQ-1201: solo cuentan los tours indexables; la guía propia (City.guide) indexa por sí sola.
      const indexableTours = [...mine, ...freetourTransfers].filter((t) => indexableProvider(t.providerId ?? "freetour")).length + here.length;
      const meets = cityMeetsRule({ activeTours, indexableTours, guide: city.guide });
      const indexed = nextCityIndexState({ indexed: !!city.indexableSince, failingSince: city.failingSince }, meets, now).indexed;
      nodes.push({
        id: city.id, slug: citySlug, name: cityLabel, href: cityPath(slug, citySlug), guide: city.guide,
        guideUpdatedAt: city.guideUpdatedAt, activeTours, indexableTours, indexed,
        freeTours: mine.filter((t) => t.isFreeTour).sort(byReviews),
        paidTours: mine.filter((t) => !t.isFreeTour).sort(byReviews),
        ownTrips: own,
        transportTrips: [...transport, ...freetourTransfers],
        names: placeNames(city.translations), // REQ-665
        onlineTours: (onlineByCity.get(city.id) ?? []).map((t) => tourCard(t, slug, citySlug, taxonomy, cityLabel)), // REQ-1262
      });
    }
    if (!nodes.length) continue;
    nodes.sort((a, b) => b.activeTours - a.activeTours || a.name.localeCompare(b.name, "es"));
    out.push({ id: c.id, iso2, slug, name: placeName(countryTranslations(iso2, c.translations), iso2), href: countryPath(slug), indexable: countryIndexable(nodes), cities: nodes, names: placeNames(countryTranslations(iso2, c.translations)) }); // REQ-1265
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

/** Todas las fichas de la ciudad (incluye transporte: su ficha y el sitemap siguen, REQ-172). */
export const allTours = (city: CityNode) => [...city.freeTours, ...city.paidTours, ...city.ownTrips, ...city.transportTrips];
/** REQ-1262: todo lo que tiene ficha en la ciudad (lo listado y las experiencias en línea). */
export const fichaTours = (city: CityNode) => [...allTours(city), ...(city.onlineTours ?? [])];
