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

/** La guía es el campo editorial propio de Travel Puzzle (nunca texto de FREETOUR). */
export interface CityRuleInput { activeTours: number; guide: string | null }

// REQ-089
export function cityMeetsRule({ activeTours, guide }: CityRuleInput): boolean {
  if (activeTours >= INDEX_MIN_TOURS) return true;
  return activeTours >= 1 && wordCount(guide) >= GUIDE_MIN_WORDS;
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
export interface CityIndexRow { id: number; activeTours: number; guide: string | null; indexableSince: string | null; failingSince: string | null }
export interface CityIndexUpdate { id: number; indexableSince: string | null; failingSince: string | null }

/**
 * REQ-090: lo que el sync escribe al cerrar una corrida exitosa. failingSince se fija el primer día que deja de
 * cumplir y se borra cuando vuelve a cumplir; indexableSince se vacía al día 14 sin cumplir. Solo devuelve cambios.
 */
// REQ-090
export function planCityIndexing(cities: readonly CityIndexRow[], now: Date): CityIndexUpdate[] {
  const out: CityIndexUpdate[] = [];
  for (const c of cities) {
    const meets = cityMeetsRule({ activeTours: c.activeTours, guide: c.guide });
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
