/**
 * REQ-1360: cifras públicas de la agencia. La calificación y el número de reseñas de FREETOUR
 * no son de Travel Puzzle (cumplimiento-freetour C7), así que no se publican ni se serializan.
 * Puro: sin I/O ni formato de idioma.
 */
export interface AgencyStatsInput {
  tours: number;
  cities: number;
  countries: number;
  rating?: number | null;
  reviews?: number | null;
}

export interface PublicStats {
  tours: number;
  cities: number;
  countries: number;
}

export function publicStats(s: AgencyStatsInput): PublicStats {
  return { tours: s.tours, cities: s.cities, countries: s.countries };
}

/** Hay cifras que mostrar: un conteo positivo (la calificación ya no cuenta). */
export function hasLiveStats(s: AgencyStatsInput | null): boolean {
  return !!s && (s.tours > 0 || s.cities > 0 || s.countries > 0);
}
