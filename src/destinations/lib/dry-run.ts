/**
 * Ensayo de identidad (Ola 3): con lo exportado de D1 calcula ISO-2, slugs de ciudades y slugs de tours,
 * reporta duplicados y pendientes y arma el SQL que solo llena lo vacío. Puro: no lee ni escribe la base.
 */
import { assignCitySlugs, assignTourSlugs, type CitySlugAssignment } from "./assign-slugs";
import { DEFAULT_PROVIDER, iso2FromCountry } from "./ids";
import { tourSlug } from "./slug";

export interface CountryExport { id: number; code: string; iso2?: string | null }
export interface CityExport { id: number; countryId: number; translations: unknown; slug?: string | null; stateCode?: string | null }
export interface TourExport {
  id: string;
  externalId: number;
  providerId?: string | null;
  cityId: number;
  countryId: number;
  titleEs?: string | null;
  titleEn?: string | null;
  slug?: string | null;
}

export interface CountryIso { id: number; iso2: string | null; source: "kept" | "new" | "pending"; reason?: string }

function parseJson(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object") return v as Record<string, unknown>;
  if (typeof v !== "string" || !v) return null;
  try {
    const o = JSON.parse(v);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

/** REQ-087: nombre de la ciudad para la URL: español, luego inglés, luego el primero que haya. */
export function cityName(translations: unknown): string {
  const t = parseJson(translations);
  if (!t) return "";
  const pick = [t.es, t.en, ...Object.values(t)].find((v) => typeof v === "string" && v.trim());
  return typeof pick === "string" ? pick.trim() : "";
}

/** REQ-085: ISO-2 por país. Si dos países darían el mismo código (único en la base), ambos van a revisión. */
export function planCountryIso(countries: readonly CountryExport[]): CountryIso[] {
  const savedOwner = new Map(countries.flatMap((c) => (c.iso2 ? [[c.iso2, c.id] as const] : [])));
  const computed = countries.map((c) => ({ c, iso: c.iso2 ? null : iso2FromCountry({ code: c.code }) }));
  const count = new Map<string, number>();
  for (const { iso } of computed) if (iso) count.set(iso, (count.get(iso) ?? 0) + 1);
  return computed.map(({ c, iso }): CountryIso => {
    if (c.iso2) return { id: c.id, iso2: c.iso2, source: "kept" };
    if (!iso) return { id: c.id, iso2: null, source: "pending", reason: "código no es ISO-2" };
    if (savedOwner.has(iso)) return { id: c.id, iso2: null, source: "pending", reason: `${iso} ya lo tiene el país ${savedOwner.get(iso)}` };
    if ((count.get(iso) ?? 0) > 1) return { id: c.id, iso2: null, source: "pending", reason: `${iso} repetido en ${count.get(iso)} países` };
    return { id: c.id, iso2: iso, source: "new" };
  });
}

/** REQ-086: slugs repetidos (debe salir vacío). */
export function findDuplicates(rows: ReadonlyArray<{ id: string | number; slug: string | null }>): { slug: string; ids: (string | number)[] }[] {
  const by = new Map<string, (string | number)[]>();
  for (const r of rows) if (r.slug) by.set(r.slug, [...(by.get(r.slug) ?? []), r.id]);
  return [...by].filter(([, ids]) => ids.length > 1).map(([slug, ids]) => ({ slug, ids }));
}

const tourTitle = (t: TourExport) => (t.titleEs?.trim() || t.titleEn?.trim() || "");

/** REQ-085/086/087: plan completo del ensayo. */
export function planIdentity(input: { countries: readonly CountryExport[]; cities: readonly CityExport[]; tours: readonly TourExport[] }) {
  const countries = planCountryIso(input.countries);

  const cityInputs = input.cities.map((c) => ({ id: c.id, countryId: c.countryId, name: cityName(c.translations), slug: c.slug ?? null, stateCode: c.stateCode ?? null }));
  const cities: CitySlugAssignment[] = assignCitySlugs(cityInputs);

  const existing = input.tours.map((t) => ({ id: t.id, providerId: t.providerId || DEFAULT_PROVIDER, externalId: t.externalId, slug: t.slug ?? null }));
  const incoming = input.tours.map((t) => ({ id: t.id, providerId: t.providerId || DEFAULT_PROVIDER, externalId: t.externalId, title: tourTitle(t) }));
  const assigned = assignTourSlugs(existing, incoming);
  const titleById = new Map(input.tours.map((t) => [t.id, tourTitle(t)]));
  const tours = assigned.map((a) => ({ ...a, id: a.id as string }));

  const nameById = new Map(cityInputs.map((c) => [c.id, c]));
  const report = {
    countries: { total: countries.length, pending: countries.filter((c) => c.source === "pending").map((c) => ({ id: c.id, reason: c.reason })) },
    cities: {
      total: cities.length,
      kept: cities.filter((c) => c.source === "kept").length,
      new: cities.filter((c) => c.source === "new").length,
      pending: cities.filter((c) => c.source === "pending").length,
    },
    cityPending: cities
      .filter((c) => c.source === "pending")
      .map((c) => ({ id: c.id, countryId: nameById.get(c.id)!.countryId, name: nameById.get(c.id)!.name, reason: c.reason })),
    cityDuplicates: [...new Set(cityInputs.map((c) => c.countryId))].flatMap((country) =>
      findDuplicates(cities.filter((c) => nameById.get(c.id)!.countryId === country)).map((d) => ({ countryId: country, ...d })),
    ),
    tours: {
      total: tours.length,
      kept: tours.filter((t) => t.source === "kept").length,
      new: tours.filter((t) => t.source === "new").length,
      fallback: tours.filter((t) => t.source === "fallback").length,
      pending: tours.filter((t) => t.source === "pending").length,
      withSuffix: tours.filter((t) => t.source === "new" && t.slug !== tourSlug(titleById.get(t.id) ?? "")).length,
    },
    tourDuplicates: findDuplicates(tours),
    tourFallback: tours.filter((t) => t.source === "fallback" || t.source === "pending").map((t) => ({ id: t.id, key: t.key, slug: t.slug, title: titleById.get(t.id) ?? "" })),
  };
  return { countries, cities, tours, report };
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** REQ-086: SQL del ensayo. Solo llena lo vacío; un slug guardado nunca se toca. Sin DELETE ni INSERT. */
export function buildIdentitySql(plan: ReturnType<typeof planIdentity>): string {
  const lines = ["-- Ola 3: identidad y slugs (generado por src/scripts/slugs-ensayo.ts). Solo llena columnas vacías."];
  for (const c of plan.countries) if (c.source === "new" && c.iso2) lines.push(`UPDATE "Country" SET "iso2" = ${q(c.iso2)} WHERE "id" = ${c.id} AND "iso2" IS NULL;`);
  for (const c of plan.cities) if (c.source === "new" && c.slug) lines.push(`UPDATE "City" SET "slug" = ${q(c.slug)} WHERE "id" = ${c.id} AND "slug" IS NULL;`);
  for (const t of plan.tours)
    if ((t.source === "new" || t.source === "fallback") && t.slug && t.id) lines.push(`UPDATE "Tour" SET "slug" = ${q(t.slug)} WHERE "id" = ${q(t.id)} AND "slug" IS NULL;`);
  return lines.join("\n") + "\n";
}

/** REQ-085: SQL de geonameid solo para los cruces automáticos y solo si la ciudad no tiene uno. */
export function buildGeonameSql(matches: ReadonlyArray<{ cityId: number; status: string; geonameid: number | null }>): string {
  return matches
    .filter((m) => m.status === "auto" && m.geonameid)
    .map((m) => `UPDATE "City" SET "geonameid" = ${m.geonameid} WHERE "id" = ${m.cityId} AND "geonameid" IS NULL;\n`)
    .join("");
}

/** CSV simple (RFC 4180) para las listas de revisión. */
export function toCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}
