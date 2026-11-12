/**
 * Mapeo de las ciudades de un proveedor contra el catálogo de Travel Puzzle (Tangol ola 2, gate B).
 *
 * Puro: recibe las ciudades y los países que ya existen por parámetro (DIP) y no lee ni escribe la base.
 * Quien hace el I/O (el sync) decide qué insertar con lo que aquí se devuelve.
 *
 * REQ-1624 (decidido por el PO el 11 nov 2026, «Y hacemos un cruce también»):
 *  - antes de crear nada se hace el CRUCE, para no duplicar una ciudad que ya existe
 *    (primero por país + GeoNames; si no, por nombre normalizado con la regla del proveedor, REQ-1606);
 *  - el id de una ciudad nueva es su `geonameid` cuando se conoce; si no, el siguiente libre del rango
 *    reservado del proveedor (desde 9,000,000; Tangol 9,000,001…), para que nunca choque con los de Freetour;
 *  - el `slug` sigue siendo único dentro del país (REQ-087).
 */
import { assignCitySlugs, type CityInput } from "@/destinations/lib/assign-slugs";
import { placeName, tripCityMatch } from "@/destinations/lib/catalog";

/** Ciudad que ya está en el catálogo, con su ISO-2 ya unido (como `placeable` en /destinos). */
export interface ExistingCity {
  id: number;
  countryId: number;
  iso2: string | null;
  slug: string | null;
  stateCode: string | null;
  geonameid: number | null;
  translations: unknown;
}

/** Destino tal como lo da el proveedor (en Tangol, `destinationSchema`: Id, Description, CountryCode). */
export interface ProviderCity {
  externalId: string;
  name: string;
  countryCode: string;
  /** Solo si ya se conoce; el cruce con GeoNames vive en `src/destinations/lib/geonames.ts`. */
  geonameid?: number | null;
}

/** Fila de la tabla de mapeo proveedor → ciudad (REQ-3369, migración 0028; antes 0027, main la ocupó con proveedores_mila). */
export interface ProviderCityRow {
  provider: string;
  externalId: string;
  cityId: number;
  providerName: string;
  countryCode: string;
  /** Cómo se resolvió: cruce por GeoNames, cruce por nombre, o ciudad nueva creada en este plan. */
  source: "geonames" | "nombre" | "nueva";
}

/** Ciudad que hay que crear, ya con id y slug resueltos. */
export interface NewCity {
  id: number;
  countryId: number;
  /** Nombre limpio (sin la nota entre paréntesis del proveedor). */
  name: string;
  slug: string | null;
  geonameid: number | null;
  idSource: "geonames" | "rango";
}

export interface PendingCity {
  externalId: string;
  name: string;
  countryCode: string;
  reason: string;
}

export interface ProviderCityPlan {
  /** Una fila por destino del proveedor que quedó resuelto. */
  mapeo: ProviderCityRow[];
  /** Ciudades a crear (ids que nunca chocan con los de Freetour). */
  nuevas: NewCity[];
  /** Destinos que NO se resolvieron: nadie debe inventarles un id. */
  pendientes: PendingCity[];
}

/** REQ-1624: desde aquí arrancan los rangos reservados por proveedor; debajo viven los ids de Freetour y GeoNames. */
export const RESERVED_CITY_ID_MIN = 9_000_000;
/** Tamaño del bloque de cada proveedor (Tangol tiene ~184 ciudades; sobra de más). */
export const RESERVED_CITY_ID_BLOCK = 100_000;

/**
 * Un proveedor sin rango registrado NO recibe ids: se registra aquí a mano para que dos proveedores
 * nunca compartan bloque (el siguiente empezaría en 9,100,001).
 */
const PROVIDER_RANGE_START: Record<string, number> = { tangol: RESERVED_CITY_ID_MIN + 1 };

export interface IdRange {
  start: number;
  end: number;
}

/** REQ-3368: rango reservado del proveedor, o null si no tiene uno registrado. */
// REQ-3368
export function providerCityIdRange(provider: string): IdRange | null {
  const start = PROVIDER_RANGE_START[provider.trim().toLowerCase()];
  return start === undefined ? null : { start, end: start + RESERVED_CITY_ID_BLOCK - 1 };
}

/** REQ-3367: nombre del proveedor sin la nota entre paréntesis ni espacios de más («El Calafate (opcional)» → «El Calafate»). */
// REQ-3367
export function cleanProviderCityName(name: string): string {
  return (name ?? "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

/** REQ-3367: el mismo nombre ya sin acentos ni mayúsculas, para comparar y para agrupar («Iguazú» = «Iguazu»). */
// REQ-3367
export function normalizeProviderCityName(name: string): string {
  return cleanProviderCityName(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export type CityCross = { match: number } | { nueva: true };

/**
 * REQ-3367 / REQ-1624: ¿esta ciudad del proveedor ya existe? Primero por país + GeoNames; si no,
 * por nombre con la MISMA regla del proveedor que usa /destinos y el mapa (`tripCityMatch`, REQ-1606:
 * el nombre exacto gana y se tolera una palabra de más al final), para no inventar un segundo criterio.
 */
// REQ-3367
export function crossProviderCity(city: ProviderCity, cities: readonly ExistingCity[]): CityCross {
  const iso = (city.countryCode ?? "").trim().toUpperCase();
  if (!iso) return { nueva: true };
  const sameCountry = cities.filter((c) => (c.iso2 ?? "").trim().toUpperCase() === iso);

  // 1) país + GeoNames: es el cruce más firme, gana aunque el proveedor escriba otro nombre.
  if (city.geonameid) {
    const byGeo = sameCountry.filter((c) => c.geonameid === city.geonameid).sort((a, b) => a.id - b.id)[0];
    if (byGeo) return { match: byGeo.id };
  }

  // 2) nombre normalizado, con la regla del proveedor (REQ-1606). El 2 (exacto) gana al 1 (una palabra de más).
  const trip = { countries: [iso], cities: [city.name ?? ""] };
  const ranked = sameCountry
    .map((c) => ({ id: c.id, score: tripCityMatch(trip, iso, c.translations) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.id - b.id);
  return ranked.length ? { match: ranked[0].id } : { nueva: true };
}

/** Orden estable de los destinos: el resultado no depende del orden en que lleguen. */
function compareExternalIds(a: ProviderCity, b: ProviderCity): number {
  const [x, y] = [Number(a.externalId), Number(b.externalId)];
  if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return x - y;
  return String(a.externalId).localeCompare(String(b.externalId));
}

export interface PlanInput {
  provider: string;
  destinos: readonly ProviderCity[];
  cities: readonly ExistingCity[];
  countries: readonly { id: number; iso2: string | null }[];
  /** Solo para pruebas y para un proveedor con bloque propio; por omisión, el rango registrado. */
  range?: IdRange;
}

interface Group {
  key: string;
  iso: string;
  countryId: number;
  name: string;
  geonameid: number | null;
  destinos: ProviderCity[];
}

/**
 * REQ-3367 + REQ-3368: plan completo de ciudades de un proveedor. Devuelve el mapeo de cada destino,
 * las ciudades que hay que crear (con id y slug) y lo que queda pendiente. No escribe nada.
 */
// REQ-3367 REQ-3368
export function planProviderCities({ provider, destinos, cities, countries, range }: PlanInput): ProviderCityPlan {
  const band = range ?? providerCityIdRange(provider);
  const countryByIso = new Map(countries.flatMap((c) => (c.iso2 ? [[c.iso2.trim().toUpperCase(), c.id] as const] : [])));
  const mapeo: ProviderCityRow[] = [];
  const pendientes: PendingCity[] = [];
  const orden = [...destinos].sort(compareExternalIds);

  // Paso 1: cruce. Lo que ya existe se liga; lo demás se agrupa (dos destinos con el mismo nombre
  // normalizado en el mismo país son UNA sola ciudad nueva, no dos).
  const groups: Group[] = [];
  const byKey = new Map<string, Group>();
  for (const d of orden) {
    const iso = (d.countryCode ?? "").trim().toUpperCase();
    const row = { provider, externalId: d.externalId, cityId: 0, providerName: d.name, countryCode: iso };
    const cross = crossProviderCity(d, cities);
    if ("match" in cross) {
      const porGeo = !!d.geonameid && cities.some((c) => c.id === cross.match && c.geonameid === d.geonameid);
      mapeo.push({ ...row, cityId: cross.match, source: porGeo ? "geonames" : "nombre" });
      continue;
    }
    const name = cleanProviderCityName(d.name);
    if (!name) {
      pendientes.push({ externalId: d.externalId, name: d.name, countryCode: iso, reason: "el proveedor no da un nombre utilizable" });
      continue;
    }
    const countryId = countryByIso.get(iso);
    if (countryId === undefined) {
      pendientes.push({ externalId: d.externalId, name: d.name, countryCode: iso, reason: `el país ${iso} no está en el catálogo` });
      continue;
    }
    const key = `${iso}|${normalizeProviderCityName(d.name)}|${d.geonameid ?? ""}`;
    const group = byKey.get(key);
    if (group) {
      group.destinos.push(d);
      continue;
    }
    const nuevo: Group = { key, iso, countryId, name, geonameid: d.geonameid ?? null, destinos: [d] };
    byKey.set(key, nuevo);
    groups.push(nuevo);
  }

  // Paso 2: ids. `geonameid` si se conoce y está libre; si no, el siguiente libre del rango del proveedor.
  // Un geonameid que ya es el id de otra ciudad no se reutiliza (y si cae dentro del rango, el cursor lo salta).
  const taken = new Set<number>(cities.map((c) => c.id));
  const asignadas: (Group & { id: number; idSource: NewCity["idSource"] })[] = [];
  let cursor = band?.start ?? 0;
  for (const g of groups) {
    const geo = g.geonameid;
    if (geo && Number.isInteger(geo) && geo > 0 && !taken.has(geo)) {
      taken.add(geo);
      asignadas.push({ ...g, id: geo, idSource: "geonames" });
      continue;
    }
    if (!band) {
      for (const d of g.destinos) pendientes.push({ externalId: d.externalId, name: d.name, countryCode: g.iso, reason: `el proveedor ${provider} no tiene rango de ids reservado` });
      continue;
    }
    while (cursor <= band.end && taken.has(cursor)) cursor++;
    if (cursor > band.end) {
      for (const d of g.destinos) pendientes.push({ externalId: d.externalId, name: d.name, countryCode: g.iso, reason: `rango reservado de ${provider} agotado (${band.start}–${band.end})` });
      continue;
    }
    taken.add(cursor);
    asignadas.push({ ...g, id: cursor, idSource: "rango" });
    cursor++;
  }

  // Paso 3: slug. Se delega en REQ-086/087 (`assignCitySlugs`): único dentro del país, el guardado no cambia
  // y una homónima sin código de estado queda sin slug (pendiente de revisión), nunca con un slug inventado.
  const entradas: CityInput[] = [
    ...cities.map((c) => ({ id: c.id, countryId: c.countryId, name: placeName(c.translations, c.slug ?? ""), slug: c.slug, stateCode: c.stateCode })),
    ...asignadas.map((g) => ({ id: g.id, countryId: g.countryId, name: g.name, slug: null, stateCode: null })),
  ];
  const slugs = new Map(assignCitySlugs(entradas).map((a) => [a.id, a.slug]));

  const nuevas: NewCity[] = [];
  for (const g of asignadas) {
    nuevas.push({ id: g.id, countryId: g.countryId, name: g.name, slug: slugs.get(g.id) ?? null, geonameid: g.geonameid, idSource: g.idSource });
    for (const d of g.destinos) mapeo.push({ provider, externalId: d.externalId, cityId: g.id, providerName: d.name, countryCode: g.iso, source: "nueva" });
  }

  mapeo.sort((a, b) => compareExternalIds({ externalId: a.externalId } as ProviderCity, { externalId: b.externalId } as ProviderCity));
  return { mapeo, nuevas, pendientes };
}
