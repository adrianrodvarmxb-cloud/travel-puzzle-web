/**
 * Ficha única, ola 4 «Geografía» (plan `docs/plan-ficha-unica-2026-11.md`, decisiones 27, 28 y 30 firmadas el 14 nov 2026).
 * Puro: sin Prisma, sin fetch, sin DOM. Las banderas llegan por parámetro (`env`).
 *
 * - REQ-10735 (decisión 27, REQ-10605): una experiencia sin punto exacto usa las coordenadas de su ciudad como pin
 *   en el mapa de /tours y en Destinos; sin coordenadas de ciudad, sin pin (nunca un punto inventado).
 * - REQ-10736 (decisión 28, REQ-10606): la ficha sin punto exacto pinta un círculo de «Zona aproximada» centrado en la
 *   ciudad, sin botón «Cómo llegar». Con punto exacto, el mapa de hoy con el botón.
 * - REQ-10738 (decisión 30, REQ-10608): los tours de FREETOUR con coordenadas vacías (hoy su mapa pintaría el centro por
 *   omisión) usan el centro de su ciudad como «Zona aproximada»; primero se mide cuántos son.
 * - REQ-10737: banderas `CITY_PIN_FALLBACK_ENABLED` y `ZONE_MAP_ENABLED` (wrangler.jsonc, "false"). Apagadas, nada cambia.
 */
import { parseCoords, type LatLng } from "./coords";
import { cityPoints, type CityPoint } from "./cities";

/** Coordenadas de la ciudad tal como vienen de `City.lat` / `City.lng` (migración 0035, REQ-10734). */
export interface CityCoords {
  lat: number | null | undefined;
  lng: number | null | undefined;
}

export interface GeoFlagsEnv {
  CITY_PIN_FALLBACK_ENABLED?: string;
  ZONE_MAP_ENABLED?: string;
}

/** REQ-10737: pin de respaldo por coordenadas de ciudad (mapa de /tours y Destinos). */
export function cityPinFallbackEnabled(env: GeoFlagsEnv): boolean {
  return env.CITY_PIN_FALLBACK_ENABLED === "true";
}

/** REQ-10737: círculo de «Zona aproximada» en la ficha. */
export function zoneMapEnabled(env: GeoFlagsEnv): boolean {
  return env.ZONE_MAP_ENABLED === "true";
}

const inRange = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/** Coordenadas de ciudad válidas (en rango y distintas de 0,0); null si faltan. */
export function cityLatLng(city: CityCoords | null | undefined): LatLng | null {
  if (!city || typeof city.lat !== "number" || typeof city.lng !== "number") return null;
  if (!Number.isFinite(city.lat) || !Number.isFinite(city.lng) || !inRange(city.lat, city.lng)) return null;
  return { lat: city.lat, lng: city.lng };
}

export interface Pin extends LatLng {
  /** true: punto de encuentro real; false: coordenadas de la ciudad (pin de respaldo). */
  exact: boolean;
}

/**
 * REQ-10735: pin de una experiencia. Punto exacto si lo hay; si no, con la bandera encendida, las coordenadas de su
 * ciudad; sin coordenadas (o con la bandera apagada), null = sin pin.
 */
export function tourPin(point: LatLng | null | undefined, city: CityCoords | null | undefined, env: GeoFlagsEnv): Pin | null {
  if (point) return { lat: point.lat, lng: point.lng, exact: true };
  if (!cityPinFallbackEnabled(env)) return null;
  const c = cityLatLng(city);
  return c ? { lat: c.lat, lng: c.lng, exact: false } : null;
}

export interface CityPointWithFallback extends CityPoint {
  /** true: la ciudad no tenía puntos de encuentro y usa sus propias coordenadas (REQ-10735). */
  fallback: boolean;
}

/**
 * REQ-10735: puntos del mapa por ciudad (mediana de sus puntos de encuentro, `cityPoints`) más, con la bandera
 * encendida, las ciudades con tours pero sin ningún punto, ubicadas en sus coordenadas de ciudad. Sin coordenadas
 * siguen fuera del mapa, como hoy. El orden de `cityPoints` se conserva; las de respaldo van después.
 */
export function cityPointsWithFallback(
  rows: { cityId: number; coords: string | null }[],
  cities: ReadonlyMap<number, CityCoords>,
  env: GeoFlagsEnv,
): CityPointWithFallback[] {
  const base: CityPointWithFallback[] = cityPoints(rows).map((p) => ({ ...p, fallback: false }));
  if (!cityPinFallbackEnabled(env)) return base;
  const placed = new Set(base.map((p) => p.cityId));
  const count = new Map<number, number>();
  for (const r of rows) {
    if (placed.has(r.cityId)) continue;
    count.set(r.cityId, (count.get(r.cityId) ?? 0) + 1);
  }
  for (const [cityId, tours] of count) {
    const c = cityLatLng(cities.get(cityId));
    if (c) base.push({ cityId, lat: c.lat, lng: c.lng, tours, fallback: true });
  }
  return base;
}

/** Radio del círculo de «Zona aproximada» (metros). Supuesto de construcción, no decisión del PO: se ajusta sin migrar. */
export const ZONE_RADIUS_M = 1500;

export type FichaMapView =
  | { kind: "exact"; lat: number; lng: number; directions: true }
  | { kind: "zone"; lat: number; lng: number; radiusM: number; directions: false };

/**
 * REQ-10736 y REQ-10738: qué pinta el mapa de la ficha. Con punto exacto, el mapa de hoy con «Cómo llegar». Sin punto
 * (FREETOUR con coordenadas vacías, Tangol sin punto exacto, viajes sin punto de encuentro) y con `ZONE_MAP_ENABLED`,
 * círculo de «Zona aproximada» en el centro de la ciudad, sin botón. Sin coordenadas de ciudad o con la bandera
 * apagada, null: la ficha no pinta mapa (nunca un centro por omisión).
 */
export function fichaMapView(point: LatLng | null | undefined, city: CityCoords | null | undefined, env: GeoFlagsEnv, radiusM = ZONE_RADIUS_M): FichaMapView | null {
  if (point) return { kind: "exact", lat: point.lat, lng: point.lng, directions: true };
  if (!zoneMapEnabled(env)) return null;
  const c = cityLatLng(city);
  return c ? { kind: "zone", lat: c.lat, lng: c.lng, radiusM, directions: false } : null;
}

export interface SinCoordenadasPorProveedor {
  providerId: string;
  total: number;
  sinCoordenadas: number;
  /** De los sin coordenadas, cuántos tienen ciudad con coordenadas (podrían usar «Zona aproximada»). */
  conCiudad: number;
}

/**
 * REQ-10738 (decisión 30, «primero se mide cuántos son»): tours activos sin punto de encuentro válido, por proveedor,
 * y cuántos de ellos ya podrían ubicarse en su ciudad. `coords` es el texto «lat,lng» del punto de encuentro
 * (`parseCoords`); vacío, inválido o 0,0 cuenta como sin coordenadas. Ordenado por más faltantes.
 */
export function sinCoordenadasPorProveedor(
  rows: ReadonlyArray<{ providerId: string; cityId: number; coords: string | null }>,
  cities: ReadonlyMap<number, CityCoords> = new Map(),
): SinCoordenadasPorProveedor[] {
  const acc = new Map<string, SinCoordenadasPorProveedor>();
  for (const r of rows) {
    const a = acc.get(r.providerId) ?? { providerId: r.providerId, total: 0, sinCoordenadas: 0, conCiudad: 0 };
    a.total += 1;
    if (!parseCoords(r.coords)) {
      a.sinCoordenadas += 1;
      if (cityLatLng(cities.get(r.cityId))) a.conCiudad += 1;
    }
    acc.set(r.providerId, a);
  }
  return [...acc.values()].sort((x, y) => y.sinCoordenadas - x.sinCoordenadas || x.providerId.localeCompare(y.providerId));
}
