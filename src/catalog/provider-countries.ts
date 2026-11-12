/**
 * REQ-3442: raíz del dominio para los países que solo tiene un proveedor. Lee el dato versionado
 * (`data/paises-de-proveedor.json`) y se apoya en la lógica pura de `lib/provider-countries.ts`.
 *
 * Dar de alta otro país es UNA línea en el JSON (misma forma que `data/search-synonyms.json`), no código.
 *
 * Nadie llama esto todavía: el alta real en la base la hará el sync del proveedor (otro frente), que debe
 * pasarle los países que ya existen y escribir `nuevos` con su `iso2` (hoy `upsertCountries` no escribe `iso2`).
 */
import raw from "../../data/paises-de-proveedor.json";
import {
  parseProviderCountries,
  planProviderCountries,
  type ExistingCountry,
  type ProviderCountryList,
  type ProviderCountryPlan,
} from "./lib/provider-countries";

/** REQ-3442: los países propios de cada proveedor, ya validados. */
// REQ-3442
export function providerCountryLists(): ProviderCountryList[] {
  return parseProviderCountries(raw);
}

/** REQ-3442: plan de alta con el dato del repo y los países que ya existen (recibidos por parámetro). */
// REQ-3442
export function planCountriesFromRepoData(countries: readonly ExistingCountry[]): ProviderCountryPlan {
  return planProviderCountries({ providers: providerCountryLists(), countries });
}
