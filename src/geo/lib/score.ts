/**
 * Puntaje nombre + distancia y decisión del cruce v2 (REQ-124). Puro.
 * La distancia es puntaje, no filtro. Los umbrales son la propuesta del informe y se calibran con el ensayo.
 */

export type MatchKind = "exact" | "variant" | "fuzzy" | "nearest";

export interface Candidate {
  geonameid: number;
  name: string;
  admin1: string;
  countryCode: string;
  population: number;
  lat: number;
  lng: number;
  match: MatchKind;
  /** 1 exacta, 0.97 variante, Jaro-Winkler en fuzzy, 0 si solo es la más cercana. */
  nameScore: number;
  /** null si la ciudad no tiene centroide. */
  distanceKm: number | null;
  /** Código de GeoNames (PPL, PPLA, PPLX…). PPLX = sección de una ciudad (barrio). */
  featureCode?: string;
  /** false = el nombre solo coincide con un alternatename suelto (no con el nombre, asciiname ni es/en). */
  strong?: boolean;
}

export interface ScoredCandidate extends Candidate {
  score: number;
}

export type MatchStatus = "auto" | "revisar" | "sin-candidato";

export interface MatchDecision {
  status: MatchStatus;
  /** Propuesto (también en «revisar»); null si no hay. */
  geonameid: number | null;
  reason: string;
  top: ScoredCandidate[];
}

export const THRESHOLDS = {
  /** Nombre exacto o variante a esta distancia o menos → auto si no hay otro igual cerca. */
  autoKm: 30,
  /** Nombre exacto a 30–70 km → auto si no hay rival con el mismo nombre a menos de rivalKm. */
  autoFarKm: 70,
  rivalKm: 150,
  /** Fuzzy: Jaro-Winkler mínimo y distancia máxima. */
  fuzzyJw: 0.93,
  fuzzyKm: 15,
  /** Desempate por población (centroide no confiable): el primero debe tener ≥ 10× el segundo. */
  populationLead: 10,
  /** Puntaje de distancia: 1 hasta fullKm, 0 desde zeroKm. */
  fullKm: 15,
  zeroKm: 100,
} as const;

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** REQ-124: puntaje de distancia (1 a ≤ 15 km, lineal a 0 en 100 km; null = 0.5 neutro). */
export function distanceScore(km: number | null): number {
  if (km === null) return 0.5;
  if (km <= THRESHOLDS.fullKm) return 1;
  if (km >= THRESHOLDS.zeroKm) return 0;
  return round(1 - (km - THRESHOLDS.fullKm) / (THRESHOLDS.zeroKm - THRESHOLDS.fullKm));
}

/** REQ-124: puntaje total = 0.6 × nombre + 0.4 × distancia. */
export function scoreCandidate(c: { nameScore: number; distanceKm: number | null }): number {
  return round(0.6 * c.nameScore + 0.4 * distanceScore(c.distanceKm));
}

const km = (d: number | null) => (d === null ? "?" : String(Math.round(d * 10) / 10));

/** REQ-124: decide auto / revisar / sin-candidato. «La más cercana» sin nombre nunca es auto. */
export function decideMatch(input: { candidates: readonly Candidate[]; reliable: boolean }): MatchDecision {
  const scored = input.candidates
    .map((c) => ({ ...c, score: scoreCandidate(c) }))
    .sort((a, b) => b.score - a.score || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || b.population - a.population);
  const top = scored.slice(0, 3);
  if (!scored.length) return { status: "sin-candidato", geonameid: null, reason: "sin coincidencia de nombre ni ciudad cercana", top };
  const out = (status: MatchStatus, c: ScoredCandidate, reason: string): MatchDecision => ({ status, geonameid: c.geonameid, reason, top });
  const T = THRESHOLDS;
  // Un barrio (PPLX) solo cuenta si no hay una ciudad con ese nombre.
  const noSections = (xs: ScoredCandidate[]) => (xs.some((c) => c.featureCode !== "PPLX") ? xs.filter((c) => c.featureCode !== "PPLX") : xs);

  if (!input.reliable) {
    // Centroide no confiable: decide «nombre exacto único en el país», con desempate por población.
    // Solo cuentan los nombres fuertes: «La Palma» como alternatename de La Palma del Condado no basta.
    const exact = noSections(scored.filter((c) => c.match === "exact" && c.strong !== false)).sort((a, b) => b.population - a.population);
    if (exact.length === 1) return out("auto", exact[0], "centroide no confiable; nombre exacto único en el país");
    if (exact.length > 1) {
      if (exact[0].population >= T.populationLead * Math.max(1, exact[1].population))
        return out("auto", exact[0], `centroide no confiable; ${exact.length} con ese nombre, desempate por población`);
      return out("revisar", exact[0], `centroide no confiable; ${exact.length} con ese nombre`);
    }
    const weak = scored.find((c) => c.match === "exact");
    if (weak) return out("revisar", weak, "centroide no confiable; el nombre solo coincide con un alternatename");
    return out("revisar", scored[0], `centroide no confiable; sin nombre exacto (${scored[0].match})`);
  }

  // El nombre exacto manda sobre las variantes si hay uno a ≤ 70 km; los barrios (PPLX) no compiten con la ciudad.
  const byKm = (a: ScoredCandidate, b: ScoredCandidate) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  const exactNear = scored.filter((c) => c.match === "exact" && (c.distanceKm ?? Infinity) <= T.autoFarKm);
  const named = noSections(exactNear.length ? scored.filter((c) => c.match === "exact") : scored.filter((c) => c.match === "exact" || c.match === "variant")).sort(byKm);
  if (named.length) {
    const [best, ...rest] = named;
    const d = best.distanceKm ?? Infinity;
    const rivalsNear = rest.filter((c) => c.geonameid !== best.geonameid && (c.distanceKm ?? Infinity) <= T.autoKm);
    if (d <= T.autoKm) {
      if (rivalsNear.length) return out("revisar", best, `varias coincidencias a menos de ${T.autoKm} km`);
      return out("auto", best, `nombre ${best.match === "exact" ? "exacto" : "variante"} a ${km(d)} km`);
    }
    if (best.match === "exact" && d <= T.autoFarKm) {
      const rivals = rest.filter((c) => (c.distanceKm ?? Infinity) <= T.rivalKm);
      if (!rivals.length) return out("auto", best, `nombre exacto a ${km(d)} km sin rival a ${T.rivalKm} km`);
      return out("revisar", best, `nombre exacto a ${km(d)} km con ${rivals.length} rival(es)`);
    }
    return out("revisar", best, `el nombre coincide pero a ${km(d)} km del centroide`);
  }

  const fuzzy = scored.filter((c) => c.match === "fuzzy");
  if (fuzzy.length) {
    const ok = fuzzy.filter((c) => c.nameScore >= T.fuzzyJw && (c.distanceKm ?? Infinity) <= T.fuzzyKm);
    if (ok.length === 1) return out("auto", ok[0], `nombre parecido (JW ${round(ok[0].nameScore, 2)}) a ${km(ok[0].distanceKm)} km`);
    return out("revisar", fuzzy[0], `nombre parecido (JW ${round(fuzzy[0].nameScore, 2)}) a ${km(fuzzy[0].distanceKm)} km`);
  }

  return out("revisar", scored[0], `sin coincidencia de nombre; la más cercana a ${km(scored[0].distanceKm)} km`);
}
