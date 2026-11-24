/**
 * REQ-10872 · Ciudad del catálogo de un viaje (raíz del dominio: orquesta, no calcula). Pide a la base las ciudades de
 * los países del viaje y las cruza con `tripCityIdFor` (misma regla que /destinos y el mapa). Recibe la base por
 * parámetro (DIP); nunca importa Prisma ni lee `process.env` aquí. Sin países o sin ciudades no consulta nada. Si la
 * base falla, el error sube: la página deja el bloque 20 fuera y sigue (regla 7).
 */
import { tripCityIdFor, type CatalogCityRef, type TripPlaceNames } from "./lib/trip-city";

export interface TripCityDeps {
  /** Ciudades del catálogo de esos países (ISO-2 en mayúsculas), con sus nombres en todos los idiomas. */
  citiesInCountries(iso2s: string[]): Promise<CatalogCityRef[]>;
}

// REQ-10872
export async function loadTripCityId(deps: TripCityDeps, trip: TripPlaceNames): Promise<number | null> {
  const iso2s = [...new Set(trip.countries.map((c) => c.trim().toUpperCase()).filter(Boolean))];
  if (!iso2s.length || !trip.cities.some((c) => c.trim())) return null;
  const cities = await deps.citiesInCountries(iso2s);
  return tripCityIdFor(trip, cities);
}

/** Dependencia real: D1 por el Prisma público. Solo lectura. */
// REQ-10872
export async function tripCityDeps(): Promise<TripCityDeps> {
  const { getPrisma } = await import("@/lib/prisma");
  return {
    citiesInCountries: async (iso2s) => {
      const rows = await getPrisma().city.findMany({
        where: { country: { iso2: { in: iso2s } } },
        select: { id: true, translations: true, country: { select: { iso2: true } } },
      });
      return rows.flatMap((r) => (r.country.iso2 ? [{ id: r.id, iso2: r.country.iso2, translations: r.translations }] : []));
    },
  };
}
