/**
 * Cruce de ciudades con GeoNames (gate 3 firmado: cruce automático + revisión). Puro.
 * Se cruza por país (ISO-2) + nombre + cercanía al centroide de los puntos de encuentro de sus tours.
 * Lo dudoso va a una lista para revisión manual; nada se escribe en la base desde aquí.
 */
import { slugify } from "./slug";

export interface GeoCity {
  geonameid: number;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  admin1: string;
  population: number;
  names: string[]; // nombres normalizados (slug) para comparar
}

export interface Point {
  lat: number;
  lng: number;
}

/** A esta distancia o menos, una coincidencia de nombre se acepta sola. */
export const AUTO_KM = 30;
/** Sin coincidencia de nombre, se propone la ciudad más cercana a esta distancia o menos. */
export const NEAR_KM = 15;

const HAN = /[㐀-鿿豈-﫿]/;

/** REQ-085: una línea de cities15000.txt (formato «geoname» de GeoNames, separado por tabuladores). */
export function parseGeonamesLine(line: string): GeoCity | null {
  const f = line.split("\t");
  if (f.length < 15) return null;
  const geonameid = Number(f[0]);
  const lat = Number(f[4]);
  const lng = Number(f[5]);
  if (!Number.isInteger(geonameid) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const raw = [f[1], f[2], ...(f[3] ? f[3].split(",") : [])].filter((n) => n && !HAN.test(n));
  const names = [...new Set(raw.map(slugify).filter(Boolean))];
  return { geonameid, name: f[1], lat, lng, countryCode: f[8], admin1: f[10], population: Number(f[14]) || 0, names };
}

/** REQ-085: «lat, lng» del punto de encuentro de FREETOUR. (0,0) o fuera de rango → null. */
export function parseCoordinates(text: unknown): Point | null {
  if (typeof text !== "string") return null;
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const [lat, lng] = [Number(m[1]), Number(m[2])];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** REQ-085: centroide de los puntos de encuentro (mediana, para que un punto mal capturado no lo mueva). */
export function centroid(points: readonly Point[]): Point | null {
  if (!points.length) return null;
  return { lat: median(points.map((p) => p.lat)), lng: median(points.map((p) => p.lng)) };
}

/** Distancia en km (haversine). */
export function distanceKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export interface GeoIndex {
  byCountry: Map<string, GeoCity[]>;
  byName: Map<string, Map<string, GeoCity[]>>; // país → nombre normalizado → ciudades
}

export function buildGeoIndex(cities: Iterable<GeoCity>): GeoIndex {
  const byCountry = new Map<string, GeoCity[]>();
  const byName = new Map<string, Map<string, GeoCity[]>>();
  for (const c of cities) {
    byCountry.set(c.countryCode, [...(byCountry.get(c.countryCode) ?? []), c]);
    const names = byName.get(c.countryCode) ?? new Map<string, GeoCity[]>();
    for (const n of c.names) names.set(n, [...(names.get(n) ?? []), c]);
    byName.set(c.countryCode, names);
  }
  return { byCountry, byName };
}

export type MatchStatus = "auto" | "revisar" | "sin-candidato";

export interface CityMatch {
  status: MatchStatus;
  geonameid: number | null;
  name: string | null;
  admin1: string | null;
  distanceKm: number | null;
  reason: string;
}

const km = (d: number) => Math.round(d * 10) / 10;

function found(status: MatchStatus, g: GeoCity, d: number | null, reason: string): CityMatch {
  return { status, geonameid: g.geonameid, name: g.name, admin1: g.admin1, distanceKm: d === null ? null : km(d), reason };
}

const none = (reason: string): CityMatch => ({ status: "sin-candidato", geonameid: null, name: null, admin1: null, distanceKm: null, reason });

/** REQ-085 (gate 3): propone el geonameid de una ciudad y dice si se acepta solo o va a revisión. */
export function matchCity(city: { names: readonly string[]; iso2: string | null; centroid: Point | null }, index: GeoIndex): CityMatch {
  if (!city.iso2) return none("país sin ISO-2");
  const byName = index.byName.get(city.iso2);
  const keys = [...new Set(city.names.map(slugify).filter(Boolean))];
  const candidates = [...new Set(keys.flatMap((k) => byName?.get(k) ?? []))];

  if (!city.centroid) {
    if (!candidates.length) return none("sin coincidencia de nombre y sin puntos de encuentro");
    const best = [...candidates].sort((a, b) => b.population - a.population)[0];
    return found("revisar", best, null, `sin puntos de encuentro para comprobar cercanía (${candidates.length} con ese nombre)`);
  }

  const at = city.centroid;
  if (candidates.length) {
    const ranked = candidates.map((g) => ({ g, d: distanceKm(at, g) })).sort((a, b) => a.d - b.d);
    const [best, second] = ranked;
    if (best.d > AUTO_KM) return found("revisar", best.g, best.d, `el nombre coincide pero a ${km(best.d)} km del centroide`);
    if (second && second.d <= AUTO_KM) return found("revisar", best.g, best.d, `varias coincidencias a menos de ${AUTO_KM} km`);
    return found("auto", best.g, best.d, "país + nombre + cercanía");
  }

  let nearest: { g: GeoCity; d: number } | null = null;
  for (const g of index.byCountry.get(city.iso2) ?? []) {
    const d = distanceKm(at, g);
    if (!nearest || d < nearest.d) nearest = { g, d };
  }
  if (nearest && nearest.d <= NEAR_KM) return found("revisar", nearest.g, nearest.d, `sin coincidencia de nombre; la más cercana a ${km(nearest.d)} km`);
  return none("sin coincidencia de nombre ni ciudad cercana en cities15000");
}
