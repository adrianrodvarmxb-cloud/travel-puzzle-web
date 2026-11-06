/**
 * ¿Sirve el centroide de los puntos de encuentro para cruzar la ciudad? (cruce v2, REQ-132). Puro.
 * No sirve si es relleno (Greenwich 51.478,0.0015), si lo comparten varias ciudades (los tours salen de otra
 * ciudad, p. ej. Delphi desde Atenas), si los puntos están muy dispersos o si no cae cerca de ninguna ciudad del país.
 */

export interface Point {
  lat: number;
  lng: number;
}

/** Puntos de relleno conocidos de FREETOUR. */
export const FILLER_POINTS: readonly Point[] = [{ lat: 51.478, lng: 0.0015 }];
export const FILLER_KM = 0.5;
/** Dos ciudades con el centroide a menos de esto «comparten» centroide. */
export const SHARED_KM = 1;
/** Dispersión mediana de los puntos por encima de esto → no confiable. */
export const SPREAD_KM = 25;
/** Si la ciudad del país más cercana al centroide está más lejos que esto, el centroide no cae en el país. */
export const OUT_OF_COUNTRY_KM = 50;

/** Distancia en km (haversine). */
export function distanceKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** REQ-132: centroide = mediana de lat y de lng (un punto mal capturado no lo mueve). */
export function centroidOf(points: readonly Point[]): Point | null {
  if (!points.length) return null;
  return { lat: median(points.map((p) => p.lat)), lng: median(points.map((p) => p.lng)) };
}

/** REQ-132: dispersión = mediana de la distancia de cada punto al centroide. */
export function spreadKm(points: readonly Point[], c: Point): number {
  return points.length ? median(points.map((p) => distanceKm(p, c))) : 0;
}

export interface CentroidAssessment {
  centroid: Point | null;
  reliable: boolean;
  reasons: string[];
  spreadKm: number | null;
}

/**
 * REQ-132: evalúa el centroide de cada ciudad.
 * `nearestOwnCountryKm(cityId, centroid)` = distancia a la ciudad más cercana de su país (I/O inyectado).
 * `sameGroup(a, b)` = true si las dos son alias de la misma ciudad (no cuentan como «compartido»).
 */
export function assessCentroids(
  cities: ReadonlyArray<{ id: number; points: readonly Point[] }>,
  nearestOwnCountryKm: (cityId: number, c: Point) => number,
  opts: { sameGroup?: (a: number, b: number) => boolean } = {},
): Map<number, CentroidAssessment> {
  const sameGroup = opts.sameGroup ?? (() => false);
  const base = cities.map((c) => ({ id: c.id, points: c.points, centroid: centroidOf(c.points) }));
  const out = new Map<number, CentroidAssessment>();
  for (const c of base) {
    if (!c.centroid) {
      out.set(c.id, { centroid: null, reliable: false, reasons: ["sin puntos de encuentro"], spreadKm: null });
      continue;
    }
    const at = c.centroid;
    const reasons: string[] = [];
    if (FILLER_POINTS.some((f) => distanceKm(f, at) <= FILLER_KM)) reasons.push("relleno (Greenwich)");
    const shared = base.filter((o) => o.id !== c.id && o.centroid && !sameGroup(c.id, o.id) && distanceKm(o.centroid, at) <= SHARED_KM);
    if (shared.length) reasons.push(`compartido con ${shared.length} ciudad(es): ${shared.slice(0, 5).map((o) => o.id).join(" ")}`);
    const spread = spreadKm(c.points, at);
    if (spread > SPREAD_KM) reasons.push(`dispersión de ${Math.round(spread)} km`);
    const near = nearestOwnCountryKm(c.id, at);
    if (near > OUT_OF_COUNTRY_KM) reasons.push(`no cae en el país (ciudad del país más cercana a ${Number.isFinite(near) ? Math.round(near) : "∞"} km)`);
    out.set(c.id, { centroid: at, reliable: reasons.length === 0, reasons, spreadKm: Math.round(spread * 10) / 10 });
  }
  return out;
}
