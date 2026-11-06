/**
 * Lecturas de D1 para /destinos (Olas 4 a 6). Solo lectura y SQL directo (sin Prisma): lo usan las páginas
 * y también el middleware. Las columnas de las migraciones 0014 (syncStatus) y 0015 (slug, iso2) ya están
 * aplicadas en producción; hoy los slugs están vacíos, así que todo devuelve listas vacías sin fallar.
 */
import type { CityRow, CountryRow, TourRow, TripRow } from "./lib/catalog";
import { placeStatus, type TourStatus } from "./lib/routes";

export interface D1Read {
  prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } };
}

export interface TourPlaceRow {
  id: string;
  slug: string | null;
  status: TourStatus;
  title: string;
  countrySlug: string | null;
  citySlug: string | null;
  cityName: string;
  /** La ciudad todavía tiene tours publicados (su página existe). */
  cityLive: boolean;
}

export interface TripPlaceRow { slug: string; kind: string; countries: string[]; cities: string[] }

export interface DestinationsRepo {
  countries(): Promise<CountryRow[]>;
  cities(): Promise<CityRow[]>;
  tours(): Promise<TourRow[]>;
  trips(): Promise<(TripRow & { kind: string })[]>;
  tourPlaceById(id: string): Promise<TourPlaceRow | null>;
  tourPlaceBySlug(slug: string): Promise<TourPlaceRow | null>;
  countrySlugWithTours(countryId: number): Promise<string | null>;
  tripBySlug(slug: string): Promise<TripPlaceRow | null>;
  /** Ciudades con slug de estos países (ISO-2), para ubicar un viaje propio. */
  citiesOf(iso2: string[]): Promise<(CityRow & { iso2: string })[]>;
}

const json = (v: unknown): unknown => {
  if (typeof v !== "string") return v ?? null;
  try { return JSON.parse(v); } catch { return null; }
};
const strs = (v: unknown): string[] => { const a = json(v); return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : []; };
const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(v as string).toISOString());
const bool = (v: unknown) => v === true || Number(v) === 1;
const status = (v: unknown): TourStatus => (v === "missing" || v === "removed" ? v : "active");

const LISTED = `t."slug" IS NOT NULL AND t."isActive" = 1 AND t."syncStatus" <> 'removed'`;
const TITLE = `COALESCE(NULLIF(es."title", ''), NULLIF(en."title", ''), '')`;
const JOIN_TITLES = `LEFT JOIN "TourTranslation" es ON es."tourId" = t."id" AND es."language" = 'es' LEFT JOIN "TourTranslation" en ON en."tourId" = t."id" AND en."language" = 'en'`;

function cityRow(r: Record<string, unknown>): CityRow {
  return {
    id: Number(r.id), countryId: Number(r.countryId), translations: json(r.translations), slug: (r.slug as string | null) ?? null,
    guide: (r.guide as string | null) ?? null, guideUpdatedAt: iso(r.guideUpdatedAt), indexableSince: iso(r.indexableSince), failingSince: iso(r.failingSince),
  };
}

// REQ-092: isActive entra para que un tour dado de baja (isActive=0) responda 410 aunque syncStatus siga 'active'.
const PLACE = `SELECT t."id", t."slug", t."syncStatus", t."isActive", ${TITLE} AS "title", co."iso2", c."slug" AS "citySlug", c."translations" AS "cityTr",
  EXISTS (SELECT 1 FROM "Tour" t2 WHERE t2."cityId" = c."id" AND t2."slug" IS NOT NULL AND t2."isActive" = 1 AND t2."syncStatus" <> 'removed') AS "cityLive"
  FROM "Tour" t JOIN "City" c ON c."id" = t."cityId" JOIN "Country" co ON co."id" = t."countryId" ${JOIN_TITLES}`;

function placeRow(r: Record<string, unknown> | undefined, cityName: (tr: unknown) => string): TourPlaceRow | null {
  if (!r) return null;
  return {
    id: String(r.id), slug: (r.slug as string | null) ?? null, status: placeStatus(r.syncStatus, r.isActive), title: String(r.title ?? ""),
    countrySlug: typeof r.iso2 === "string" && r.iso2 ? r.iso2.toLowerCase() : null, citySlug: (r.citySlug as string | null) ?? null,
    cityName: cityName(json(r.cityTr)), cityLive: bool(r.cityLive),
  };
}

// REQ-088 REQ-092
export function createDestinationsRepo(db: D1Read, opts: { cityName: (tr: unknown) => string; tripImage: (key: string) => string; tripPrice: (n: number | null, currency: string) => string | null }): DestinationsRepo {
  const all = async (sql: string, ...params: unknown[]) => (await db.prepare(sql).bind(...params).all()).results;
  return {
    async countries() {
      const rows = await all('SELECT "id", "code", "iso2", "translations" FROM "Country" WHERE "iso2" IS NOT NULL');
      return rows.map((r) => ({ id: Number(r.id), code: String(r.code), iso2: (r.iso2 as string | null) ?? null, translations: json(r.translations) }));
    },
    async cities() {
      return (await all('SELECT "id", "countryId", "translations", "slug", "guide", "guideUpdatedAt", "indexableSince", "failingSince" FROM "City" WHERE "slug" IS NOT NULL')).map(cityRow);
    },
    async tours() {
      const rows = await all(
        `SELECT t."id", t."externalId", t."slug", t."cityId", t."countryId", ${TITLE} AS "title", t."providerTitle", t."priceValue", t."priceCurrency",
         t."rating", t."reviewsNumber", t."titleImageURL", t."duration", t."syncStatus", t."isActive", t."updatedAt", t."categoryId", t."durationMinutes"
         FROM "Tour" t JOIN "City" c ON c."id" = t."cityId" ${JOIN_TITLES} WHERE ${LISTED} AND c."slug" IS NOT NULL`
      );
      return rows.map((r) => ({
        id: String(r.id), externalId: Number(r.externalId), slug: (r.slug as string | null) ?? null, cityId: Number(r.cityId), countryId: Number(r.countryId),
        title: String(r.title ?? ""), provider: (r.providerTitle as string | null) ?? null, price: Number(r.priceValue ?? 0), currency: String(r.priceCurrency ?? "EUR"),
        rating: r.rating === null || r.rating === undefined ? null : Number(r.rating), reviews: Number(r.reviewsNumber ?? 0),
        image: (r.titleImageURL as string | null) ?? null, duration: (r.duration as string | null) ?? null, status: status(r.syncStatus),
        isActive: bool(r.isActive), updatedAt: iso(r.updatedAt) ?? new Date(0).toISOString(),
        categoryId: r.categoryId === null || r.categoryId === undefined ? null : Number(r.categoryId), // REQ-522
        durationMinutes: r.durationMinutes === null || r.durationMinutes === undefined ? null : Number(r.durationMinutes),
      }));
    },
    async trips() {
      // REQ-523/524: agencia, días y resumen para la tarjeta única.
      const rows = await all('SELECT tr."id", tr."slug", tr."kind", tr."titleEs", tr."summaryEs", tr."durationDays", tr."agencyId", a."name" AS "agencyName", tr."countries", tr."cities", tr."images", tr."priceFrom", tr."currency", tr."updatedAt" FROM "Trip" tr LEFT JOIN "Agency" a ON a."id" = tr."agencyId" WHERE tr."status" = \'published\'');
      return rows.map((r) => {
        const images = json(r.images);
        const first = Array.isArray(images) && images[0] && typeof (images[0] as { key?: unknown }).key === "string" ? (images[0] as { key: string }).key : null;
        return {
          id: String(r.id), slug: String(r.slug), kind: String(r.kind), title: String(r.titleEs ?? ""), image: first ? opts.tripImage(first) : null,
          countries: strs(r.countries), cities: strs(r.cities), priceLabel: opts.tripPrice(r.priceFrom === null ? null : Number(r.priceFrom), String(r.currency ?? "MXN")),
          updatedAt: iso(r.updatedAt) ?? new Date(0).toISOString(),
          agencyId: (r.agencyId as string | null) ?? null, agency: (r.agencyName as string | null) ?? null,
          durationDays: r.durationDays === null || r.durationDays === undefined ? null : Number(r.durationDays), summary: (r.summaryEs as string | null) ?? null,
          priceFrom: r.priceFrom === null || r.priceFrom === undefined ? null : Number(r.priceFrom),
        };
      });
    },
    async tourPlaceById(id) {
      return placeRow((await all(`${PLACE} WHERE t."id" = ?`, id))[0], opts.cityName);
    },
    async tourPlaceBySlug(slug) {
      return placeRow((await all(`${PLACE} WHERE t."slug" = ?`, slug))[0], opts.cityName);
    },
    async countrySlugWithTours(countryId) {
      const r = (await all(
        `SELECT co."iso2" FROM "Country" co WHERE co."id" = ? AND co."iso2" IS NOT NULL AND EXISTS (SELECT 1 FROM "Tour" t JOIN "City" c ON c."id" = t."cityId" WHERE t."countryId" = co."id" AND c."slug" IS NOT NULL AND ${LISTED})`,
        countryId
      ))[0];
      return typeof r?.iso2 === "string" ? r.iso2.toLowerCase() : null;
    },
    async tripBySlug(slug) {
      const r = (await all('SELECT "slug", "kind", "countries", "cities" FROM "Trip" WHERE "slug" = ? AND "status" = \'published\'', slug))[0];
      return r ? { slug: String(r.slug), kind: String(r.kind), countries: strs(r.countries), cities: strs(r.cities) } : null;
    },
    async citiesOf(iso2) {
      if (!iso2.length) return [];
      const rows = await all(
        `SELECT c."id", c."countryId", c."translations", c."slug", c."guide", c."guideUpdatedAt", c."indexableSince", c."failingSince", co."iso2" FROM "City" c JOIN "Country" co ON co."id" = c."countryId" WHERE c."slug" IS NOT NULL AND co."iso2" IN (${iso2.map(() => "?").join(", ")})`,
        ...iso2.map((x) => x.toUpperCase())
      );
      return rows.map((r) => ({ ...cityRow(r), iso2: String(r.iso2) }));
    },
  };
}
