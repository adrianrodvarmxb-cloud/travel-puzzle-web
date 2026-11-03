/** Puntos del mapa por ciudad y tours de su tarjeta. */
import { parseCoords } from "./coords";
import { mixRecommendations } from "@/booking/lib/recommendations";

export interface CityPoint {
  cityId: number;
  lat: number;
  lng: number;
  tours: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (n: number) => Math.round(n * 1e5) / 1e5;

/** Un punto por ciudad en la mediana de sus puntos de encuentro (un tour mal ubicado no lo mueve). */
export function cityPoints(rows: { cityId: number; coords: string | null }[]): CityPoint[] {
  const acc = new Map<number, { lats: number[]; lngs: number[]; tours: number }>();
  for (const r of rows) {
    const c = parseCoords(r.coords);
    const a = acc.get(r.cityId) ?? { lats: [], lngs: [], tours: 0 };
    a.tours += 1;
    if (c) {
      a.lats.push(c.lat);
      a.lngs.push(c.lng);
    }
    acc.set(r.cityId, a);
  }
  return [...acc.entries()]
    .filter(([, a]) => a.lats.length > 0)
    .map(([cityId, a]) => ({ cityId, lat: round(median(a.lats)), lng: round(median(a.lngs)), tours: a.tours }));
}

/** Los 3 tours de la tarjeta, con la regla 60/40 (de pago / gratis); se rellena si faltan de un tipo. */
export function cardTours<T>(paid: T[], free: T[], includePaid: boolean): T[] {
  return mixRecommendations(paid, free, 3, includePaid);
}
