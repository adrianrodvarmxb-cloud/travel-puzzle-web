/**
 * REQ-10736 (ficha única, ola 4, decisión 28): círculo de «Zona aproximada» para la ficha sin punto exacto. Puro: arma
 * el polígono GeoJSON que pinta MapLibre (que no trae círculos en metros) y el zoom con el que se ve completo.
 */
import type { LatLng } from "./coords";

const R = 6371008.8; // radio medio de la Tierra (m)

export interface ZoneFeature {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
}

/** Polígono de `steps` lados aproximando el círculo de `radiusM` metros centrado en `center` (anillo cerrado). */
export function zoneCircle(center: LatLng, radiusM: number, steps = 64): ZoneFeature {
  const lat0 = (center.lat * Math.PI) / 180;
  const dLat = (radiusM / R) * (180 / Math.PI);
  const dLng = dLat / Math.cos(lat0);
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const a = (2 * Math.PI * i) / steps;
    ring.push([center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)]);
  }
  ring.push(ring[0]);
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

/** Zoom con el que un círculo de `radiusM` cabe en el mapa de la ficha (~256 px de alto): 1.5 km ≈ 13. */
export function zoneZoom(radiusM: number): number {
  return Math.max(10, Math.min(14, Math.round(13 - Math.log2(radiusM / 1500))));
}
