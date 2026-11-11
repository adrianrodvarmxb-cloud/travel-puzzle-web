/** Viajes propios y de agencia en el mapa (REQ-1575, REQ-1578). Puro. */
import { tripInCity } from "@/destinations/lib/catalog";
import { tripPath } from "@/trips/lib/public";

export interface MapTrip {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  priceFrom: number | null;
  currency: string;
  countries: string[];
  cities: string[];
  meetingPoints: { name?: string; lat: number | null; lng: number | null }[];
}

export interface MapCityRef {
  id: number;
  iso2: string;
  translations: unknown;
}

/** Lugar con viajes que no es ciudad del catálogo (pin propio, como GetYourGuide y Viator). */
export interface TripPlace {
  key: string;
  iso2: string;
  name: string;
  lat: number;
  lng: number;
  trips: MapTrip[];
}

const slugText = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// REQ-1578
export const placeKey = (iso2: string, name: string) => `${slugText(iso2)}-${slugText(name)}`;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (n: number) => Math.round(n * 1e5) / 1e5;
const firstPoint = (t: MapTrip) => t.meetingPoints.find((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) ?? null;

/**
 * Reparte los viajes: a la primera ciudad del viaje que existe en el catálogo (misma regla que /destinos)
 * o, si ninguna existe, a un lugar propio con la mediana de sus puntos de encuentro.
 */
// REQ-1575, REQ-1578
export function placeTrips(trips: MapTrip[], cities: MapCityRef[]) {
  const byCity = new Map<number, MapTrip[]>();
  const placeAcc = new Map<string, { iso2: string; name: string; lats: number[]; lngs: number[]; trips: MapTrip[] }>();
  let skipped = 0;

  for (const t of trips) {
    let cityId: number | null = null;
    for (const name of t.cities) {
      const hit = cities.find((c) => tripInCity({ countries: t.countries, cities: [name] }, c.iso2, c.translations));
      if (hit) { cityId = hit.id; break; }
    }
    if (cityId !== null) {
      byCity.set(cityId, [...(byCity.get(cityId) ?? []), t]);
      continue;
    }
    const p = firstPoint(t);
    const iso2 = (t.countries[0] ?? "").toUpperCase();
    const name = t.cities[0]?.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim(); // REQ-1591
    if (!p || !iso2 || !name) { skipped++; continue; }
    const key = placeKey(iso2, name);
    const a = placeAcc.get(key) ?? { iso2, name, lats: [], lngs: [], trips: [] };
    a.lats.push(p.lat as number);
    a.lngs.push(p.lng as number);
    a.trips.push(t);
    placeAcc.set(key, a);
  }
  if (skipped) console.warn(`[map] ${skipped} viaje(s) sin ciudad del catálogo ni punto de encuentro con coordenadas: no salen en el mapa`);

  const places: TripPlace[] = [...placeAcc.entries()].map(([key, a]) => ({
    key, iso2: a.iso2, name: a.name, lat: round(median(a.lats)), lng: round(median(a.lngs)), trips: a.trips,
  }));
  return { byCity, places, skipped };
}


const parseJson = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return null; }
};
const strList = (v: unknown): string[] => {
  const x = parseJson(v);
  return Array.isArray(x) ? x.filter((s): s is string => typeof s === "string" && !!s.trim()) : [];
};
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Fila publicada de Trip → lo que necesita el mapa. */
// REQ-1575
export function toMapTrip(
  r: { id: string; slug: string; kind: string; titleEs: string; images: unknown; priceFrom: number | null; currency: string; countries: unknown; cities: unknown; meetingPoints: unknown },
  imageUrl: (key: string) => string,
): MapTrip {
  const imgs = parseJson(r.images);
  const firstKey = Array.isArray(imgs) ? (imgs.find((i) => i && typeof i.key === "string") as { key: string } | undefined)?.key : undefined;
  const mps = parseJson(r.meetingPoints);
  return {
    id: r.id, slug: r.slug, title: r.titleEs, image: firstKey ? imageUrl(firstKey) : null,
    priceFrom: num(r.priceFrom), currency: r.currency, countries: strList(r.countries).map((c) => c.toUpperCase()), cities: strList(r.cities),
    meetingPoints: Array.isArray(mps) ? mps.map((p) => ({ ...(typeof p?.name === "string" ? { name: p.name } : {}), lat: num(p?.lat), lng: num(p?.lng) })) : [],
  };
}

export interface CardItem {
  id: string;
  href?: string;
  titles: Record<string, string>;
  image: string | null;
  rating: number | null;
  reviews: number;
  isFree: boolean;
  price: number | null;
  currency: string;
}

/** Viaje como renglón de la tarjeta del mapa: enlaza a su ficha pública. */
// REQ-1575
export const tripCardTour = (t: MapTrip): CardItem => ({
  id: `trip:${t.id}`, href: tripPath(t), titles: { es: t.title }, image: t.image, rating: null, reviews: 0, isFree: false, price: t.priceFrom, currency: t.currency,
});

// REQ-1575
export const cardHref = (t: { id: string; href?: string }) => t.href ?? `/tours/${t.id}`;
