/**
 * Índice de GeoNames para el cruce v2 (REQ-137): cities500 + alternateNamesV2 (solo es/en y el puente wkdt,
 * sin históricos ni coloquiales). Puro: el script lee los archivos en streaming y pasa las líneas.
 */
import { distanceKm, type Point } from "./centroid";
import { jaroWinkler, nameKeys, normalizeName } from "./normalize";
import { THRESHOLDS, type Candidate } from "./score";

export interface GeoPlace {
  geonameid: number;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  admin1: string;
  population: number;
  featureCode: string;
  /** Nombres en alfabeto latino (nombre, asciiname, alternatenames). */
  names: string[];
  /** Nombres «fuertes»: nombre, asciiname y los es/en de alternateNamesV2 (no los alternatenames sueltos). */
  strong: string[];
}

export interface AltName {
  geonameid: number;
  lang: "es" | "en" | "wkdt";
  name: string;
}

const LATIN = /[A-Za-zÀ-ɏ]/;

/** REQ-137: una línea de cities500.txt (formato «geoname», 19 columnas). */
export function parseCityLine(line: string): GeoPlace | null {
  const f = line.split("\t");
  if (f.length < 15) return null;
  const geonameid = Number(f[0]);
  const lat = Number(f[4]);
  const lng = Number(f[5]);
  if (!Number.isInteger(geonameid) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const names = [...new Set([f[1], f[2], ...(f[3] ? f[3].split(",") : [])].map((n) => n.trim()).filter((n) => n && LATIN.test(n)))];
  return { geonameid, name: f[1], lat, lng, countryCode: f[8], admin1: f[10], population: Number(f[14]) || 0, featureCode: f[7], names, strong: [...new Set([f[1], f[2]].filter(Boolean))] };
}

/** REQ-137: una línea de alternateNamesV2.txt. Solo es/en/wkdt; fuera históricos (col 8) y coloquiales (col 7). */
export function parseAltNameLine(line: string): AltName | null {
  const f = line.split("\t");
  if (f.length < 4) return null;
  const lang = f[2];
  if (lang !== "es" && lang !== "en" && lang !== "wkdt") return null;
  if (f[6] === "1" || f[7] === "1") return null;
  const geonameid = Number(f[1]);
  if (!Number.isInteger(geonameid) || !f[3]) return null;
  return { geonameid, lang, name: f[3] };
}

const CELL = 1; // grados
const cellKey = (lat: number, lng: number) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;

export interface GeoIndexV2 {
  places: Map<number, GeoPlace>;
  exact: Map<string, Map<string, GeoPlace[]>>; // país → llave exacta → lugares
  variant: Map<string, Map<string, GeoPlace[]>>; // país → variante → lugares
  keysByPlace: Map<number, string[]>; // llaves exactas por lugar (para fuzzy)
  strongKeys: Map<number, Set<string>>; // llaves de los nombres fuertes por lugar
  grid: Map<string, Map<string, GeoPlace[]>>; // país → celda → lugares
  wikidata: Map<number, string>; // geonameid → QID
}

function push<T>(m: Map<string, Map<string, T[]>>, country: string, key: string, v: T) {
  let byKey = m.get(country);
  if (!byKey) m.set(country, (byKey = new Map()));
  const arr = byKey.get(key);
  if (!arr) byKey.set(key, [v]);
  else if (!arr.includes(v)) arr.push(v);
}

/** REQ-137: arma el índice. `countries` limita a los países del catálogo (memoria). */
export function buildIndex(places: Iterable<GeoPlace>, altNames: Iterable<AltName> = [], countries?: ReadonlySet<string>): GeoIndexV2 {
  const idx: GeoIndexV2 = { places: new Map(), exact: new Map(), variant: new Map(), keysByPlace: new Map(), strongKeys: new Map(), grid: new Map(), wikidata: new Map() };
  for (const p of places) {
    if (countries && !countries.has(p.countryCode)) continue;
    idx.places.set(p.geonameid, p);
  }
  for (const a of altNames) {
    const p = idx.places.get(a.geonameid);
    if (!p) continue;
    if (a.lang === "wkdt") idx.wikidata.set(a.geonameid, a.name);
    else if (LATIN.test(a.name)) {
      if (!p.names.includes(a.name)) p.names.push(a.name);
      if (!p.strong.includes(a.name)) p.strong.push(a.name);
    }
  }
  for (const p of idx.places.values()) {
    const exactKeys = new Set<string>();
    for (const n of p.names) {
      const k = nameKeys(n, { keepQualifiers: true });
      if (!k.exact) continue;
      exactKeys.add(k.exact);
      push(idx.exact, p.countryCode, k.exact, p);
      for (const v of k.variants) push(idx.variant, p.countryCode, v, p);
    }
    idx.keysByPlace.set(p.geonameid, [...exactKeys]);
    idx.strongKeys.set(p.geonameid, new Set(p.strong.map((n) => nameKeys(n, { keepQualifiers: true }).exact).filter(Boolean)));
    push(idx.grid, p.countryCode, cellKey(p.lat, p.lng), p);
  }
  return idx;
}

function nearby(idx: GeoIndexV2, iso2: string, at: Point, rings: number): GeoPlace[] {
  const grid = idx.grid.get(iso2);
  if (!grid) return [];
  const ci = Math.floor(at.lat / CELL);
  const cj = Math.floor(at.lng / CELL);
  const out: GeoPlace[] = [];
  for (let i = ci - rings; i <= ci + rings; i++) for (let j = cj - rings; j <= cj + rings; j++) out.push(...(grid.get(`${i}:${j}`) ?? []));
  return out;
}

/** REQ-132: km a la ciudad más cercana del país (Infinity si no hay ninguna en ~2°). */
export function nearestInCountryKm(idx: GeoIndexV2, iso2: string, at: Point): number {
  let best = Infinity;
  for (const p of nearby(idx, iso2, at, 2)) best = Math.min(best, distanceKm(at, p));
  return best;
}

/** Distancia para buscar «la más cercana» y fuzzy. */
export const NEAR_KM = 25;
const FUZZY_MIN = 0.85; // se muestran en revisión; auto solo con THRESHOLDS.fuzzyJw

/** REQ-137: candidatos de GeoNames para una ciudad (exactos, variantes, fuzzy y cercanas). */
export function findCandidates(idx: GeoIndexV2, city: { iso2: string; names: readonly string[]; centroid: Point | null }): Candidate[] {
  const keys = city.names.map((n) => nameKeys(n)).filter((k) => k.exact);
  const qExact = new Set(keys.map((k) => k.exact));
  const qVar = new Set(keys.flatMap((k) => k.variants));
  const found = new Map<number, Candidate>();
  const dist = (p: GeoPlace) => (city.centroid ? Math.round(distanceKm(city.centroid, p) * 10) / 10 : null);
  const add = (p: GeoPlace, match: Candidate["match"], nameScore: number, strong = false) => {
    const prev = found.get(p.geonameid);
    if (prev && (prev.nameScore > nameScore || (prev.nameScore === nameScore && (prev.strong || !strong)))) return;
    found.set(p.geonameid, { geonameid: p.geonameid, name: p.name, admin1: p.admin1, countryCode: p.countryCode, population: p.population, lat: p.lat, lng: p.lng, featureCode: p.featureCode, strong, match, nameScore, distanceKm: dist(p) });
  };
  const ex = idx.exact.get(city.iso2);
  const va = idx.variant.get(city.iso2);
  for (const k of qExact) for (const p of ex?.get(k) ?? []) add(p, "exact", 1, idx.strongKeys.get(p.geonameid)?.has(k) ?? false);
  for (const k of qVar) for (const p of ex?.get(k) ?? []) add(p, "variant", 0.97);
  for (const k of [...qExact, ...qVar]) for (const p of va?.get(k) ?? []) add(p, "variant", 0.97);

  if (city.centroid) {
    const near = nearby(idx, city.iso2, city.centroid, 1)
      .map((p) => ({ p, d: distanceKm(city.centroid!, p) }))
      .filter((x) => x.d <= NEAR_KM)
      .sort((a, b) => a.d - b.d);
    for (const { p, d } of near) {
      if (found.has(p.geonameid) || d > THRESHOLDS.fuzzyKm * 2) continue;
      let jw = 0;
      for (const q of qExact) for (const k of idx.keysByPlace.get(p.geonameid) ?? []) jw = Math.max(jw, jaroWinkler(q, k));
      if (jw >= FUZZY_MIN) add(p, "fuzzy", Math.round(jw * 1000) / 1000);
    }
    for (const { p } of near.slice(0, 2)) if (!found.has(p.geonameid)) add(p, "nearest", 0);
  }
  return [...found.values()];
}

export { normalizeName };
