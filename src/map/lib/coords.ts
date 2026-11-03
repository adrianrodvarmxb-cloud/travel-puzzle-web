/** Coordenadas del punto de encuentro ("lat,lng", como vienen de Freetour). */
export interface LatLng {
  lat: number;
  lng: number;
}

const valid = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/** Lee "lat,lng"; corrige las invertidas (lng,lat) cuando es evidente; null si no sirven. */
export function parseCoords(value: string | null | undefined): LatLng | null {
  if (!value) return null;
  const parts = value.split(",").map((s) => s.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (valid(a, b)) return { lat: a, lng: b };
  if (valid(b, a)) return { lat: b, lng: a };
  return null;
}
