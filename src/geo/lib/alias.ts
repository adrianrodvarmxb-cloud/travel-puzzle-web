/**
 * Ciudad canónica con alias (REQ-126). Puro. El sync sigue usando el id de FREETOUR como clave y resuelve la
 * ciudad por (provider, provider_city_id) → canónica. El sistema solo sugiere alias; los confirma una persona por PR.
 */
import { distanceKm, type Point } from "./centroid";
import { parseCsv, toId } from "./csv";
import { nameKeys } from "./normalize";

export interface CityAlias {
  provider: string;
  providerCityId: number;
  cityKey: string;
  canonicalCityId: number;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** REQ-126: lee city-aliases.csv; descarta filas sin id o con city_key que no es slug. */
export function parseCityAliases(text: string): CityAlias[] {
  return parseCsv(text).flatMap((r) => {
    const id = toId(r.provider_city_id);
    const canon = toId(r.canonical_city_id);
    if (!r.provider || !id || !canon || !SLUG.test(r.city_key ?? "")) return [];
    return [{ provider: r.provider, providerCityId: id, cityKey: r.city_key, canonicalCityId: canon }];
  });
}

/** REQ-126: (provider, id) → ciudad canónica, o null si no tiene alias. */
export function resolveCityAlias(provider: string, providerCityId: number, aliases: readonly CityAlias[]): { cityKey: string; canonicalCityId: number } | null {
  const a = aliases.find((x) => x.provider === provider && x.providerCityId === providerCityId);
  return a ? { cityKey: a.cityKey, canonicalCityId: a.canonicalCityId } : null;
}

export const ALIAS_KM = 10;

/** REQ-126: sugiere alias: mismo país, alguna llave de nombre en común y centroides a ≤ 10 km (o sin centroide). */
export function suggestAliases(
  cities: ReadonlyArray<{ id: number; iso2: string | null; names: readonly string[]; centroid: Point | null }>,
): { ids: number[]; iso2: string; key: string }[] {
  const keysOf = (names: readonly string[]) => new Set(names.flatMap((n) => { const k = nameKeys(n); return [k.exact, ...k.variants]; }).filter(Boolean));
  const withKeys = cities.filter((c) => c.iso2).map((c) => ({ ...c, keys: keysOf(c.names) }));
  const out: { ids: number[]; iso2: string; key: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < withKeys.length; i++) {
    for (let j = i + 1; j < withKeys.length; j++) {
      const a = withKeys[i];
      const b = withKeys[j];
      if (a.iso2 !== b.iso2) continue;
      const key = [...a.keys].find((k) => b.keys.has(k));
      if (!key) continue;
      if (a.centroid && b.centroid && distanceKm(a.centroid, b.centroid) > ALIAS_KM) continue;
      const ids = [a.id, b.id].sort((x, y) => x - y);
      const id = ids.join(":");
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ ids, iso2: a.iso2!, key });
    }
  }
  return out;
}
