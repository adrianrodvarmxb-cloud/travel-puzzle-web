/**
 * REQ-10872 · Ficha única, ola 7 (plan §7, «encendido en viajes y Big Bus»): la ciudad del catálogo de un viaje de
 * agencia o de Big Bus, para que el bloque 20 «Otras experiencias en la ciudad» (REQ-10862) también salga en `/viajes`.
 * Un viaje guarda NOMBRES de ciudad (`Trip.cities`, texto del proveedor), no ids: aquí se cruzan con las ciudades del
 * catálogo con la MISMA regla que /destinos y el mapa (`tripCityMatch`, REQ-1606: país ISO-2 del viaje, nombre sin
 * acentos ni mayúsculas en cualquier idioma; el nombre exacto gana sobre el recortado), recorriendo las ciudades del
 * viaje en su orden (la de inicio primero, REQ-1349). Puro: sin I/O ni banderas. Sin coincidencia devuelve null: nunca
 * se inventa una ciudad ni se toma «la primera del país».
 */
import { tripCityMatch } from "@/destinations/lib/catalog";

/** Lo mínimo de una fila de `City` (con el ISO-2 de su país) para el cruce. */
export interface CatalogCityRef { id: number; iso2: string; translations: unknown }

export interface TripPlaceNames { countries: ReadonlyArray<string>; cities: ReadonlyArray<string> }

// REQ-10872
export function tripCityIdFor(trip: TripPlaceNames, cities: ReadonlyArray<CatalogCityRef>): number | null {
  const countries = trip.countries.map((c) => c.toUpperCase());
  for (const name of trip.cities) {
    let best: { score: number; id: number } | null = null;
    for (const c of cities) {
      const m = tripCityMatch({ countries, cities: [name] }, c.iso2, c.translations);
      if (m > 0 && (!best || m > best.score)) best = { score: m, id: c.id };
      if (best?.score === 2) break;
    }
    if (best) return best.id;
  }
  return null;
}
