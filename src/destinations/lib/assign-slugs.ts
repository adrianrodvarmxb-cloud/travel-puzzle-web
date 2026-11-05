/**
 * Asignación de slugs (Ola 3). Pura: recibe lo que ya está guardado y lo nuevo, y devuelve qué slug lleva cada uno.
 * Regla de oro (REQ-086): un slug guardado nunca se regenera. La base además lo impide con el trigger Tour_slug_inmutable.
 */
import { naturalKey } from "./ids";
import { CITY_SLUG_MAX, TOUR_SLUG_MAX, fallbackTourSlug, slugify, tourSlug, trimSlug, uniqueSlug } from "./slug";

export interface ExistingTour {
  id: string; // tour_uid
  providerId: string;
  externalId: number | string;
  slug: string | null;
}

export interface IncomingTour {
  providerId: string;
  externalId: number | string;
  title: string;
  id?: string | null; // tour_uid si ya existe la fila
}

export type SlugSource = "kept" | "new" | "fallback" | "pending";

export interface TourSlugAssignment {
  key: string;
  id: string | null;
  slug: string | null;
  source: SlugSource;
}

function compareKeys(a: { providerId: string; externalId: number | string }, b: { providerId: string; externalId: number | string }) {
  if (a.providerId !== b.providerId) return a.providerId < b.providerId ? -1 : 1;
  const [x, y] = [Number(a.externalId), Number(b.externalId)];
  if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
  return String(a.externalId).localeCompare(String(b.externalId));
}

/**
 * REQ-086: slugs de tours. Conserva el slug guardado (aunque cambie el título o el tour reaparezca),
 * genera uno para los que no tienen y agrega un sufijo corto si choca. El orden de llegada no cambia el resultado.
 */
export function assignTourSlugs(existing: readonly ExistingTour[], incoming: readonly IncomingTour[]): TourSlugAssignment[] {
  const byKey = new Map(existing.map((t) => [naturalKey(t.providerId, t.externalId), t]));
  const taken = new Set(existing.flatMap((t) => (t.slug ? [t.slug] : [])));
  const out: TourSlugAssignment[] = [];
  for (const t of [...incoming].sort(compareKeys)) {
    const key = naturalKey(t.providerId, t.externalId);
    const saved = byKey.get(key);
    const id = saved?.id ?? t.id ?? null;
    if (saved?.slug) {
      out.push({ key, id, slug: saved.slug, source: "kept" });
      continue;
    }
    const base = tourSlug(t.title);
    // REQ-085: el slug de reserva sale del tour_uid, nunca del external_id.
    const [seed, source]: [string, SlugSource] = base ? [base, "new"] : id ? [fallbackTourSlug(id), "fallback"] : ["", "pending"];
    if (!seed) {
      out.push({ key, id, slug: null, source });
      continue;
    }
    const slug = uniqueSlug(seed, taken, TOUR_SLUG_MAX);
    taken.add(slug);
    out.push({ key, id, slug, source });
  }
  return out;
}

export interface CityInput {
  id: number;
  countryId: number;
  name: string; // nombre que se usa en la URL (español, o inglés si no hay)
  slug: string | null;
  stateCode: string | null;
}

export interface CitySlugAssignment {
  id: number;
  slug: string | null;
  source: Exclude<SlugSource, "fallback">;
  reason?: string;
}

/**
 * REQ-087: slugs de ciudades, únicos dentro de su país. Las homónimas llevan el código de estado (san-jose-bcs);
 * la que no lo tiene queda pendiente de revisión. REQ-086: un slug guardado no cambia.
 */
export function assignCitySlugs(cities: readonly CityInput[]): CitySlugAssignment[] {
  const base = (c: CityInput) => trimSlug(slugify(c.name), CITY_SLUG_MAX);
  const result = new Map<number, CitySlugAssignment>();
  const byCountry = new Map<number, CityInput[]>();
  for (const c of cities) byCountry.set(c.countryId, [...(byCountry.get(c.countryId) ?? []), c]);

  for (const group of byCountry.values()) {
    const nameCount = new Map<string, number>();
    for (const c of group) {
      const b = base(c);
      if (b) nameCount.set(b, (nameCount.get(b) ?? 0) + 1);
    }
    const taken = new Set(group.flatMap((c) => (c.slug ? [c.slug] : [])));
    for (const c of group) if (c.slug) result.set(c.id, { id: c.id, slug: c.slug, source: "kept" });

    for (const c of [...group].filter((x) => !x.slug).sort((a, b) => a.id - b.id)) {
      const b = base(c);
      if (!b) {
        result.set(c.id, { id: c.id, slug: null, source: "pending", reason: "sin nombre utilizable" });
        continue;
      }
      let seed = b;
      if ((nameCount.get(b) ?? 0) > 1) {
        const state = slugify(c.stateCode ?? "");
        if (!state) {
          result.set(c.id, { id: c.id, slug: null, source: "pending", reason: "homónima sin código de estado" });
          continue;
        }
        seed = `${trimSlug(b, CITY_SLUG_MAX - state.length - 1)}-${state}`;
      }
      const slug = uniqueSlug(seed, taken, CITY_SLUG_MAX);
      taken.add(slug);
      result.set(c.id, { id: c.id, slug, source: "new" });
    }
  }
  return cities.map((c) => result.get(c.id)!);
}
