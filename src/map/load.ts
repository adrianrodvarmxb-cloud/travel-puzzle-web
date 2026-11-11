import type { PrismaClient } from "@prisma/client";
import { cityPoints, cardTours } from "./lib/cities";
import { placeTrips, toMapTrip, tripCardTour, type MapTrip, type MapCityRef } from "./lib/trips";
import { imageUrl } from "@/trips/lib/image";
import { isKindVisible, type Visibility } from "@/trips/lib/visibility";

export interface MapCity {
  cityId: number;
  /** REQ-1578: lugar con viajes que no es ciudad del catálogo (cityId 0). */
  place?: string;
  countryId: number;
  names: Record<string, string>;
  lat: number;
  lng: number;
  tours: number;
}

export interface CityCardTour {
  id: string;
  /** REQ-1575: ficha de un viaje propio o de agencia (los tours usan /tours/{id}). */
  href?: string;
  titles: Record<string, string>;
  image: string | null;
  rating: number | null;
  reviews: number;
  isFree: boolean;
  price: number | null;
  currency: string;
}

export interface CityCard {
  cityId: number;
  place?: string;
  countryId: number;
  names: Record<string, string>;
  tours: number;
  top: CityCardTour[];
}

const asNames = (j: unknown): Record<string, string> => {
  const o = typeof j === "string" ? safeJson(j) : j;
  return o && typeof o === "object" ? (Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>) : {};
};
function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** REQ-1575, REQ-1578: viajes publicados y visibles (sin transporte) y las ciudades del catálogo de sus países. Si falla, nada. */
async function loadMapTrips(prisma: PrismaClient, vis: Visibility): Promise<{ trips: MapTrip[]; cities: MapCityRef[] }> {
  try {
    const rows = await prisma.trip.findMany({
      where: { status: "published" },
      select: { id: true, slug: true, kind: true, titleEs: true, images: true, priceFrom: true, currency: true, countries: true, cities: true, meetingPoints: true },
    });
    const trips = rows.filter((r) => r.kind !== "transporte" && isKindVisible(r.kind, vis)).map((r) => toMapTrip(r, imageUrl));
    const iso = [...new Set(trips.flatMap((t) => t.countries))];
    if (!iso.length) return { trips, cities: [] };
    const rowsC = await prisma.city.findMany({ where: { country: { iso2: { in: iso } } }, select: { id: true, translations: true, country: { select: { iso2: true } } } });
    return { trips, cities: rowsC.flatMap((c) => (c.country.iso2 ? [{ id: c.id, iso2: c.country.iso2, translations: c.translations }] : [])) };
  } catch (error) {
    console.error("[map] sin viajes:", error);
    return { trips: [], cities: [] };
  }
}

/** Ciudades con tours activos y su ubicación (para el mapa del inicio). Si falla, lista vacía. */
export async function loadMapCities({ prisma, vis }: { prisma: PrismaClient; vis: Visibility }): Promise<MapCity[]> {
  const base = await loadTourCities(prisma);
  // REQ-1575, REQ-1578: los viajes suman en su ciudad y los lugares sin ciudad llevan pin propio.
  const { trips, cities } = await loadMapTrips(prisma, vis);
  if (!trips.length) return base;
  const { byCity, places } = placeTrips(trips, cities);
  const out = base.map((c) => ({ ...c, tours: c.tours + (byCity.get(c.cityId)?.length ?? 0) }));
  const present = new Set(base.map((c) => c.cityId));
  const missing = [...byCity.keys()].filter((id) => !present.has(id));
  if (missing.length) {
    const rows = await prisma.city.findMany({ where: { id: { in: missing } }, select: { id: true, countryId: true, translations: true } }).catch(() => []);
    for (const r of rows) {
      const here = byCity.get(r.id)!;
      const pts = here.flatMap((t) => t.meetingPoints.filter((p) => p.lat !== null && p.lng !== null));
      if (!pts.length) continue;
      out.push({ cityId: r.id, countryId: r.countryId, names: asNames(r.translations), lat: pts[0].lat!, lng: pts[0].lng!, tours: here.length });
    }
  }
  for (const p of places) out.push({ cityId: 0, place: p.key, countryId: 0, names: { es: p.name }, lat: p.lat, lng: p.lng, tours: p.trips.length });
  return out;
}

async function loadTourCities(prisma: PrismaClient): Promise<MapCity[]> {
  try {
    const rows = await prisma.$queryRaw<{ cityId: number; c: string | null }[]>`
      SELECT cityId, json_extract(meetingPoint, '$.coordinates') AS c FROM Tour WHERE isActive = 1`;
    const points = cityPoints(rows.map((r) => ({ cityId: Number(r.cityId), coords: r.c })));
    const ids = points.map((p) => p.cityId);
    const cities: { id: number; countryId: number; translations: unknown }[] = [];
    for (let i = 0; i < ids.length; i += 90) {
      cities.push(...(await prisma.city.findMany({ where: { id: { in: ids.slice(i, i + 90) } }, select: { id: true, countryId: true, translations: true } })));
    }
    const byId = new Map(cities.map((c) => [c.id, c]));
    return points.flatMap((p) => {
      const c = byId.get(p.cityId);
      return c ? [{ cityId: p.cityId, countryId: c.countryId, names: asNames(c.translations), lat: p.lat, lng: p.lng, tours: p.tours }] : [];
    });
  } catch (error) {
    console.error("[map] sin ciudades:", error);
    return [];
  }
}

const TITLE_LANGS = ["es", "en", "pt", "de", "fr", "it"];

/** Tarjeta de una ciudad: cuántos tours tiene y 3 recomendados (regla 60/40). Null si no hay o falla. */
export async function loadCityCard(cityId: number, { prisma, includePaid, vis }: { prisma: PrismaClient; includePaid: boolean; vis: Visibility }): Promise<CityCard | null> {
  try {
    // REQ-1575: los viajes de la ciudad entran primero en la parte de pago de la tarjeta.
    const { trips, cities } = await loadMapTrips(prisma, vis);
    const tripsHere = trips.length ? (placeTrips(trips, cities).byCity.get(cityId) ?? []) : [];
    const select = {
      id: true, titleImageURL: true, rating: true, reviewsNumber: true, priceValue: true, priceCurrency: true,
      translations: { where: { language: { in: TITLE_LANGS } }, select: { language: true, title: true } },
    } as const;
    const base = { cityId, isActive: true };
    const order = [{ reviewsNumber: "desc" as const }];
    const [city, count, paid, free] = await Promise.all([
      prisma.city.findUnique({ where: { id: cityId }, select: { id: true, countryId: true, translations: true } }),
      prisma.tour.count({ where: base }),
      includePaid ? prisma.tour.findMany({ where: { ...base, priceValue: { gt: 0 } }, orderBy: order, take: 3, select }) : Promise.resolve([]),
      prisma.tour.findMany({ where: { ...base, priceValue: 0 }, orderBy: order, take: 3, select }),
    ]);
    if (!city || count + tripsHere.length === 0) return null;
    const tourItems = (list: typeof paid) => list.map((t) => ({
      id: t.id,
      titles: Object.fromEntries(t.translations.map((x) => [x.language, x.title])),
      image: t.titleImageURL?.startsWith("https://") ? t.titleImageURL : null,
      rating: t.rating ? Number(t.rating) : null,
      reviews: t.reviewsNumber,
      isFree: Number(t.priceValue) === 0,
      price: Number(t.priceValue) as number | null,
      currency: t.priceCurrency,
    }));
    const tripItems = tripsHere.map(tripCardTour);
    const top = cardTours([...tripItems, ...tourItems(paid)], tourItems(free), includePaid || tripItems.length > 0);
    return { cityId: city.id, countryId: city.countryId, names: asNames(city.translations), tours: count + tripsHere.length, top };
  } catch (error) {
    console.error(`[map] sin tarjeta para la ciudad ${cityId}:`, error);
    return null;
  }
}

/** REQ-1578: tarjeta de un lugar que solo tiene viajes (pin propio). Null si ya no existe o falla. */
export async function loadPlaceCard(key: string, { prisma, vis }: { prisma: PrismaClient; vis: Visibility }): Promise<CityCard | null> {
  const { trips, cities } = await loadMapTrips(prisma, vis);
  const p = placeTrips(trips, cities).places.find((x) => x.key === key);
  if (!p) return null;
  return { cityId: 0, place: p.key, countryId: 0, names: { es: p.name }, tours: p.trips.length, top: p.trips.slice(0, 3).map(tripCardTour) };
}
