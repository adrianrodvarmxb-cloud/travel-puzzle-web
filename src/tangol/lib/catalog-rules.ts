/**
 * Reglas de exclusión del catálogo de Tangol (decisión del PO del 11 nov 2026: REQ-1554, REQ-1559).
 *
 * Puro: recibe por parámetro los viajes de agencia que ya existen (de `imports/` o de la base) y el
 * país/ciudad del tour de Tangol, y decide si se publica o se guarda oculto. No lee la base, no llama
 * a la API y no sabe nada de Prisma ni de D1: el I/O vive en quien lo llama (DIP).
 *
 * - REQ-3373: el catálogo es toda Sudamérica menos México; México nunca entra.
 * - REQ-3374: un país reservado (Perú → Inca World, Colombia → Destino Colombia) publica solo las
 *   ciudades donde esa agencia NO tiene viajes. Una sola regla por país, con su lista en datos.
 * - REQ-3375: el cruce de nombres de ciudad es el de REQ-1606 (`tripCityMatch`), no otro criterio.
 */
import { tripCityMatch } from "@/destinations/lib/catalog";

/** Viaje de agencia que ya existe en el sitio. Cuenta igual publicado o en borrador (REQ-1570). */
export interface AgencyTripPlace {
  /** Nombre de la agencia tal como llega del archivo de carga o de la base ("Inca World Peru"). */
  agency: string;
  /** Países del viaje en ISO-2. */
  countries: string[];
  /** Ciudades del viaje con el nombre que usa el proveedor. */
  cities: string[];
}

/** Destino del tour de Tangol: país ISO-2 y nombre de la ciudad del destino. */
export interface TangolTourPlace {
  country: string;
  city: string;
}

export type PublishDecision = { publicar: true } | { publicar: false; motivo: string };

/**
 * País reservado a una agencia nuestra. `aliases` son las formas con que su nombre llega en los datos
 * («Inca World Peru», «Central Inca World Travel»: el PO las trata como la misma agencia, REQ-1554).
 */
export interface ReservedCountry {
  iso2: string;
  agency: string;
  aliases: string[];
}

/** REQ-3373: países que nunca entran al catálogo de Tangol. */
export const TANGOL_COUNTRIES_OUT: readonly string[] = ["MX"];

/** REQ-3374: la cobertura concreta vive en los datos (viajes de agencia); aquí solo qué agencia reserva qué país. */
export const TANGOL_RESERVED_COUNTRIES: readonly ReservedCountry[] = [
  { iso2: "PE", agency: "Inca World", aliases: ["inca world", "central inca"] },
  { iso2: "CO", agency: "Destino Colombia", aliases: ["destino colombia"] },
];

export interface TangolRulesDeps {
  countriesOut?: readonly string[];
  reserved?: readonly ReservedCountry[];
  /** REQ-3375: por omisión el cruce de REQ-1606; se inyecta para probar la regla sin tocar el catálogo. */
  cityMatch?: typeof tripCityMatch;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const up = (s: string) => s.trim().toUpperCase();

/** ¿El nombre de la agencia del viaje es la agencia que reserva el país? Por alias, sin acentos ni mayúsculas. */
// REQ-3374
export function isReservedAgency(agency: string, rule: Pick<ReservedCountry, "aliases">): boolean {
  const name = fold(agency ?? "");
  return !!name && rule.aliases.some((a) => name.includes(fold(a)));
}

/**
 * La ciudad de Tangol como "traducciones" para `tripCityMatch`: su nombre y el mismo sin la nota entre
 * paréntesis, para que la tolerancia de REQ-1606 valga en los dos lados del cruce.
 */
// REQ-3375
function cityNames(city: string): Record<string, string> {
  const sinNota = city.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return sinNota && sinNota !== city.trim() ? { es: city.trim(), sinNota } : { es: city.trim() };
}

/**
 * Viajes de agencia a partir de un archivo de carga ya leído (`imports/<agencia>-*.json`), sin tocar el
 * disco: quien llama lee el archivo o la base. En producción la misma lista sale de las filas de `Trip`.
 */
// REQ-3374
export function agencyTripsFromImport(raw: unknown): AgencyTripPlace[] {
  const file = (raw ?? {}) as { agency?: { name?: unknown }; trips?: unknown };
  const agency = typeof file.agency?.name === "string" ? file.agency.name : "";
  const trips = Array.isArray(file.trips) ? file.trips : [];
  return trips.flatMap((t) => {
    const trip = (t as { trip?: { countries?: unknown; cities?: unknown } })?.trip;
    const countries = Array.isArray(trip?.countries) ? trip.countries.filter((x): x is string => typeof x === "string") : [];
    const cities = Array.isArray(trip?.cities) ? trip.cities.filter((x): x is string => typeof x === "string") : [];
    return countries.length && cities.length ? [{ agency, countries, cities }] : [];
  });
}

/** Ciudades que una agencia ya cubre en su país reservado, con el nombre del proveedor (para documentar y auditar). */
// REQ-3374
export function reservedCities(
  agencyTrips: readonly AgencyTripPlace[],
  deps: Pick<TangolRulesDeps, "reserved"> = {},
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const rule of deps.reserved ?? TANGOL_RESERVED_COUNTRIES) {
    const iso2 = up(rule.iso2);
    const names = agencyTrips
      .filter((t) => isReservedAgency(t.agency, rule) && t.countries.map(up).includes(iso2))
      .flatMap((t) => t.cities.map((c) => c.trim()))
      .filter((c) => !!c);
    out[iso2] = [...new Set(names)].sort((a, b) => a.localeCompare(b, "es"));
  }
  return out;
}

/**
 * ¿Se publica este tour de Tangol? `agencyTrips` son los viajes de agencia que ya existen (publicados o
 * en borrador), recibidos por parámetro: la cobertura es un dato, no código.
 */
// REQ-3373 REQ-3374 REQ-3375
export function tangolTourDecision(
  tour: TangolTourPlace,
  agencyTrips: readonly AgencyTripPlace[],
  deps: TangolRulesDeps = {},
): PublishDecision {
  const iso2 = up(tour.country ?? "");
  const city = (tour.city ?? "").trim();
  if (!iso2 || !city) return { publicar: false, motivo: "El tour no trae país o ciudad; se guarda oculto (REQ-3373)" };
  // REQ-3373: México nunca entra, haya o no viajes nuestros.
  if ((deps.countriesOut ?? TANGOL_COUNTRIES_OUT).map(up).includes(iso2)) {
    return { publicar: false, motivo: `${iso2} no entra en el catálogo de Tangol (REQ-3373)` };
  }
  // REQ-3374: una sola regla para todo país reservado; los demás países se publican completos.
  const rule = (deps.reserved ?? TANGOL_RESERVED_COUNTRIES).find((r) => up(r.iso2) === iso2);
  if (!rule) return { publicar: true };
  const match = deps.cityMatch ?? tripCityMatch;
  const names = cityNames(city);
  const covered = agencyTrips.some(
    (t) => isReservedAgency(t.agency, rule) && match({ countries: t.countries, cities: t.cities }, iso2, names) > 0,
  );
  return covered
    ? { publicar: false, motivo: `${city} (${iso2}) ya tiene viajes de ${rule.agency}; se guarda oculto (REQ-3374)` }
    : { publicar: true };
}
