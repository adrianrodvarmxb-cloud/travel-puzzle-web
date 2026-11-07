/**
 * REQ-354: alias de `destino_alias` (S5) en la resolución del buscador (S2), tras SEARCH_FUZZY_ENABLED. Puro.
 * Prioridad: alias curado > nombre exacto del catálogo > alias de la tabla. Un alias de la tabla que es el nombre de
 * otro destino del catálogo, que apunta a dos ciudades o que es muy corto (menos de 3 letras; 2 en chino, japonés o
 * coreano, donde 罗马 o 東京 tienen dos caracteres) no se usa (no adivina).
 */
import { z } from "zod";
import { fold } from "./normalize";
import { searchTokens } from "./words";
import type { CuratedAliases } from "./aliases";

export const DbAliasRow = z.object({ city_id: z.number().int().positive(), alias_plegado: z.string().min(1).max(160), alias_ascii: z.string().max(160).nullable().optional() });
export type DbAliasRow = z.infer<typeof DbAliasRow>;

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]/;
/** Largo mínimo de un alias de la tabla: 3 letras; 2 en CJK. */
export const tooShort = (k: string) => [...k.replace(/ /g, "")].length < (CJK.test(k) ? 2 : 3);

/** Lo mínimo del catálogo (CatalogEntry lo cumple). */
export interface CityNames { cityId: number; cityNames?: string[]; countryNames?: string[] }

// REQ-354
export function mergeDbAliases(curated: CuratedAliases, rows: readonly unknown[], entries: readonly (CityNames & { text?: string })[]): { aliases: CuratedAliases; used: number; skipped: number } {
  const target = new Map<number, string>();
  const existing = new Set<string>();
  const key = (n: string) => fold(searchTokens(n).join(" "));
  /** palabra de los títulos → ciudades donde aparece (un alias de una palabra que usan otras ciudades no se usa) */
  const wordCities = new Map<string, Set<number>>();
  const seenCountry = new Set<string>();
  for (const e of entries) {
    if (!target.has(e.cityId)) {
      const names = (e.cityNames ?? []).map(key).filter(Boolean);
      if (names.length) target.set(e.cityId, names[0]);
      for (const n of names) existing.add(n);
    }
    for (const n of e.countryNames ?? []) if (!seenCountry.has(n)) { seenCountry.add(n); existing.add(key(n)); }
    // e.text ya viene normalizado (toEntry): las palabras ya están plegadas, no se vuelve a plegar cada una
    for (const w of new Set(searchTokens(e.text ?? ""))) { const s = wordCities.get(w); if (s) s.add(e.cityId); else wordCities.set(w, new Set([e.cityId])); }
  }
  const byAlias = new Map<string, Set<number>>();
  let skipped = 0;
  for (const r of rows) {
    // validación barata de la forma (Zod en 11 mil filas es lento); lo raro se descarta
    const o = r as { city_id?: unknown; alias_plegado?: unknown; alias_ascii?: unknown } | null;
    const row = o && typeof o.city_id === "number" && Number.isInteger(o.city_id) && typeof o.alias_plegado === "string" && o.alias_plegado.length <= 160
      && (o.alias_ascii == null || typeof o.alias_ascii === "string") ? { data: o as DbAliasRow } : null;
    if (!row || !target.has(row.data.city_id)) { skipped++; continue; }
    for (const k of new Set([fold(row.data.alias_plegado), fold(row.data.alias_ascii ?? "")])) {
      if (!k || tooShort(k) || existing.has(k) || curated.aliases.has(k)) continue;
      const users = !k.includes(" ") ? wordCities.get(k) : undefined;
      if (users && [...users].some((c) => c !== row.data.city_id)) { skipped++; continue; } // «lion», «bat»: palabras de otros títulos
      byAlias.set(k, (byAlias.get(k) ?? new Set()).add(row.data.city_id));
    }
  }
  const aliases = new Map(curated.aliases);
  let used = 0;
  for (const [k, cities] of byAlias) {
    if (cities.size !== 1) { skipped++; continue; } // ambiguo: dos ciudades con el mismo alias
    aliases.set(k, [target.get([...cities][0])!]);
    used++;
  }
  return { aliases: { ...curated, aliases }, used, skipped };
}
