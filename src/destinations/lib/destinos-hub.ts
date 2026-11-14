/**
 * REQ-3475…3477 (gates del PO, 12 nov 2026; docs/gates-destinos-hub-2026-11-12.md): modelo de /destinos.
 * - «Más buscados»: las mismas 8 ciudades que el inicio (`pickDestinations`), con enlace a su página.
 * - Continentes: países indexables con foto de su ciudad con más tours que tenga foto; sin continente → «Otros».
 * - A–Z: los mismos países, en orden alfabético dentro de cada continente.
 * Puro.
 */
import type { CountryNode, CityNode } from "./catalog";
import { CONTINENTS, continentOf, type Continent } from "@/home/lib/continents";
import { photoFor, pickDestinations, type CityRow } from "@/home/lib/destinations";

export type HubContinent = Continent | "otros";
export interface HubCity { name: string; country: string; href: string; tours: number; image: string }
export interface HubCountry { name: string; href: string; cities: number; tours: number; image: string | null }
export interface HubGroup { continent: HubContinent; countries: HubCountry[] }
export interface DestinosHub { top: HubCity[]; continents: HubGroup[]; az: HubGroup[] }

const ORDER: HubContinent[] = [...CONTINENTS, "otros"];

/** Foto de la ciudad: la propia del sitio y, si no hay, la primera de sus tours (como el inicio). */
function cityImage(c: CityNode): string | null {
  const own = photoFor(c.names ?? { es: c.name });
  if (own) return own;
  const t = [...c.freeTours, ...c.paidTours, ...c.ownTrips].find((x) => x.image?.startsWith("https://"));
  return t?.image ?? null;
}

// REQ-3475 REQ-3476 REQ-3477
export function destinosHub(tree: readonly CountryNode[], lang: string): DestinosHub {
  const shown = tree.filter((x) => x.indexable);

  // REQ-3475 (gate B): mismo criterio que «Destinos populares» del inicio.
  const byCity = new Map<number, { city: CityNode; country: CountryNode }>();
  const rows: CityRow[] = shown.flatMap((co) => co.cities.map((ci) => {
    byCity.set(ci.id, { city: ci, country: co });
    return { cityId: ci.id, countryId: co.id, tours: ci.activeTours, cityNames: ci.names ?? { [lang]: ci.name }, countryNames: co.names ?? { [lang]: co.name }, sampleImage: cityImage(ci) };
  }));
  const top: HubCity[] = pickDestinations(rows, 8).flatMap((d) => {
    const hit = byCity.get(d.cityId);
    return hit ? [{ name: hit.city.name, country: hit.country.name, href: hit.city.href, tours: d.tours, image: d.image }] : [];
  });

  // REQ-3476 (gate C): foto del país = su ciudad con más tours que tenga foto.
  const countries = shown.map((co) => {
    const best = [...co.cities].sort((a, b) => b.activeTours - a.activeTours).map(cityImage).find(Boolean) ?? null;
    const item: HubCountry = { name: co.name, href: co.href, cities: co.cities.length, tours: co.cities.reduce((n, ci) => n + ci.activeTours, 0), image: best };
    return { continent: (continentOf(co.iso2) ?? "otros") as HubContinent, item };
  });
  const group = (sort: (a: HubCountry, b: HubCountry) => number): HubGroup[] => ORDER.flatMap((continent) => {
    const list = countries.filter((x) => x.continent === continent).map((x) => x.item).sort(sort);
    return list.length ? [{ continent, countries: list }] : [];
  });
  return {
    top,
    continents: group((a, b) => b.tours - a.tours || a.name.localeCompare(b.name, lang)),
    az: group((a, b) => a.name.localeCompare(b.name, lang)), // REQ-3477
  };
}
