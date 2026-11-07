/**
 * Regla de indexación de ciudades y países (decisión del PO, 5 nov 2026). Pura: el sync calcula y guarda
 * el estado; el render solo lo lee. Nunca se bloquea nada en robots.txt: lo que no cumple va con noindex.
 */
export const INDEX_MIN_TOURS = 3;
export const GUIDE_MIN_WORDS = 300;
export const NOINDEX_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function wordCount(text: string | null | undefined): number {
  const t = (text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * La guía es el campo editorial propio de Travel Puzzle (`City.guide`, nunca texto de FREETOUR).
 * `indexableTours`: tours activos de proveedores con permiso de indexar (`indexableProvider`, REQ-830). Sin el dato
 * vale `activeTours` (la regla de REQ-089 tal cual).
 */
export interface CityRuleInput { activeTours: number; indexableTours?: number; guide: string | null }

/**
 * REQ-1200 / REQ-1201 (PO, 7 nov 2026, 06:17, opciones (b) + (c); reemplaza el conteo de REQ-089/REQ-407):
 * - (b) ≥3 tours indexables, o ≥1 indexable + guía propia de ≥300 palabras;
 * - (c) guía propia de ≥300 palabras con cualquier tour activo (aunque sean solo de FREETOUR): su contenido
 *   indexable es 100 % nuestro y las tarjetas de FREETOUR se siguen viendo.
 * Como (c) cubre «≥1 indexable + guía», la regla queda: página con guía ≥300, o ≥3 indexables.
 * Revertir al llegar el permiso: quitar `freetour: false` de PROVIDER_INDEXABLE (indexableTours = activeTours).
 */
// REQ-089 REQ-1200 REQ-1201
export function cityMeetsRule({ activeTours, indexableTours = activeTours, guide }: CityRuleInput): boolean {
  if (activeTours < 1) return false;
  if (wordCount(guide) >= GUIDE_MIN_WORDS) return true;
  return Math.min(indexableTours, activeTours) >= INDEX_MIN_TOURS;
}

/** Estado guardado por ciudad: si está indexada y desde cuándo (ISO, UTC) deja de cumplir la regla. */
export interface CityIndexState { indexed: boolean; failingSince: string | null }

// REQ-090: pasa a noindex solo tras 14 días seguidos sin cumplir; vuelve en cuanto cumple.
export function nextCityIndexState(prev: CityIndexState | null, meets: boolean, now: Date): CityIndexState {
  if (meets) return { indexed: true, failingSince: null };
  const failingSince = prev?.failingSince ?? now.toISOString();
  if (!prev?.indexed) return { indexed: false, failingSince };
  const days = Math.floor((now.getTime() - Date.parse(failingSince)) / DAY_MS);
  return { indexed: days < NOINDEX_AFTER_DAYS, failingSince };
}

/** Lo guardado en City (migración 0015): indexableSince ≠ null = indexada; failingSince = primer día sin cumplir. */
export interface CityIndexRow { id: number; activeTours: number; /** REQ-1203 */ indexableTours?: number; guide: string | null; indexableSince: string | null; failingSince: string | null }
export interface CityIndexUpdate { id: number; indexableSince: string | null; failingSince: string | null }

/**
 * REQ-090: lo que el sync escribe al cerrar una corrida exitosa. failingSince se fija el primer día que deja de
 * cumplir y se borra cuando vuelve a cumplir; indexableSince se vacía al día 14 sin cumplir. Solo devuelve cambios.
 */
// REQ-090 REQ-1202 (la transición de 14 días aplica igual a las ciudades que dejan de cumplir por la regla nueva)
export function planCityIndexing(cities: readonly CityIndexRow[], now: Date): CityIndexUpdate[] {
  const out: CityIndexUpdate[] = [];
  for (const c of cities) {
    const meets = cityMeetsRule({ activeTours: c.activeTours, indexableTours: c.indexableTours, guide: c.guide }); // REQ-1202
    const next = nextCityIndexState({ indexed: !!c.indexableSince, failingSince: c.failingSince }, meets, now);
    const indexableSince = next.indexed ? c.indexableSince ?? now.toISOString() : null;
    if (indexableSince !== c.indexableSince || next.failingSince !== c.failingSince) out.push({ id: c.id, indexableSince, failingSince: next.failingSince });
  }
  return out;
}

// REQ-091: una ciudad sin tours activos no genera página (404).
export function cityHasPage(activeTours: number): boolean {
  return activeTours >= 1;
}

// REQ-091: un país se indexa con al menos una ciudad indexada.
export function countryIndexable(cities: { indexed: boolean }[]): boolean {
  return cities.some((c) => c.indexed);
}

/**
 * REQ-1203: consulta del sync (D1) con los tours publicados (slug, activos, no removed) y, aparte, los indexables:
 * los de proveedores fuera de `excluded` (los false de PROVIDER_INDEXABLE). Pura; la ejecuta guarded-repository.
 */
// REQ-1203
export function cityIndexInputsSql(excluded: readonly string[]): { sql: string; params: string[] } {
  const listed = 't."cityId" = c."id" AND t."slug" IS NOT NULL AND t."isActive" = 1 AND t."syncStatus" <> \'removed\'';
  const params = excluded.map((p) => p.trim().toLowerCase()).filter(Boolean);
  const only = params.length ? ` AND lower(trim(t."providerId")) NOT IN (${params.map(() => "?").join(", ")})` : "";
  return {
    sql: `SELECT c."id", c."guide", c."indexableSince", c."failingSince", (SELECT COUNT(*) FROM "Tour" t WHERE ${listed}) AS "activeTours", (SELECT COUNT(*) FROM "Tour" t WHERE ${listed}${only}) AS "indexableTours" FROM "City" c WHERE c."slug" IS NOT NULL`,
    params,
  };
}
