/**
 * REQ-350…353: ingesta offline de nombres de destino en varios idiomas (plan S5). Puro.
 * GeoNames alternateNamesV2 (CC BY 4.0, exige atribución) + Wikidata (CC0, unión por P1566) → filas de
 * `destino_alias`, solo para ciudades del catálogo con geonameid. El script solo genera CSV/SQL: nunca escribe en D1.
 * Sin Google ni OSM (gates firmados 6 nov 2026).
 */
import { fold } from "./normalize";

/** Idiomas útiles (14): los del sitio + los de los viajeros que más buscan nombres en su idioma. */
export const ALIAS_LANGS = ["es", "en", "pt", "fr", "it", "de", "nl", "ca", "ru", "el", "cs", "zh", "ja", "ko"] as const;
export type AliasLang = (typeof ALIAS_LANGS)[number];
const LANG_SET = new Set<string>(ALIAS_LANGS);
/** Códigos de GeoNames que no son idiomas (códigos postales, aeropuertos, enlaces, puente a Wikidata…). */
export const NON_LINGUISTIC = new Set(["post", "iata", "icao", "faac", "link", "wkdt", "unlc", "abbr", "tcid", "fr_1793", "phon", "piny"]);

export type AliasType = "preferido" | "nombre" | "corto" | "coloquial" | "historico" | "wikidata";
/** Peso: los preferidos ganan; coloquiales e históricos sirven para encontrar pero nunca se muestran. */
export const WEIGHT: Record<AliasType, number> = { preferido: 100, nombre: 60, wikidata: 55, corto: 50, coloquial: 10, historico: 5 };
export const VISIBLE_MIN_WEIGHT = 50;

export interface AltNameRow { geonameid: number; lang: AliasLang; name: string; type: AliasType }

/** Variante de idioma → idioma base (zh-Hans, zh-TW, pt-BR…). null si no es uno de los 14. */
// REQ-350
export function baseLang(code: string): AliasLang | null {
  const c = (code ?? "").toLowerCase();
  if (!c || NON_LINGUISTIC.has(c)) return null;
  const base = c.split(/[-_]/)[0];
  return LANG_SET.has(base) ? (base as AliasLang) : null;
}

/**
 * Una línea de alternateNamesV2.txt (tabulada): id, geonameid, isolanguage, nombre, isPreferredName, isShortName,
 * isColloquial, isHistoric, from, to. Se descartan los idiomas fuera de los 14 y los códigos no lingüísticos.
 */
// REQ-350
export function parseAlternateName(line: string): AltNameRow | null {
  const f = line.split("\t");
  if (f.length < 4) return null;
  const geonameid = Number(f[1]);
  const lang = baseLang(f[2]);
  const name = (f[3] ?? "").trim();
  if (!Number.isInteger(geonameid) || geonameid <= 0 || !lang || !name || name.length > 120) return null;
  const type: AliasType = f[7] === "1" ? "historico" : f[6] === "1" ? "coloquial" : f[4] === "1" ? "preferido" : f[5] === "1" ? "corto" : "nombre";
  return { geonameid, lang, name, type };
}

// ── Transliteración a ASCII (alias_ascii). La hace la ingesta, no el Worker. ───────────────────────────────────
// Tabla fija (sin ICU): cirílico (ruso, simplificada) y griego. CJK no se translitera: 罗马 → «luo ma» no sirve;
// se compara el alias nativo tal cual.
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ї: "i", є: "e", ґ: "g", ў: "u", ђ: "dj", ј: "j", љ: "lj", њ: "nj", ћ: "c", џ: "dz",
};
const GRK: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};
const CJK = /[぀-ヿ㐀-鿿가-힯豈-﫿]/;

/** Plegado (NFKD sin marcas) + cirílico/griego a latín. CJK queda igual. */
// REQ-351
export function toAscii(name: string): string {
  const f = fold(name);
  if (CJK.test(f)) return f;
  return [...f].map((c) => CYR[c] ?? GRK[c] ?? c).join("");
}

// ── Filas de destino_alias ───────────────────────────────────────────────────────────────────────────────────

export interface CityRef { cityId: number; countryId: number; geonameid: number }
export interface DestinoAlias {
  geonameid: number; cityId: number; countryId: number; idioma: AliasLang; alias: string;
  aliasPlegado: string; aliasAscii: string; tipo: AliasType; peso: number; fuente: "geonames" | "wikidata";
}

/** Une los nombres con las ciudades del catálogo por geonameid; uno por (geonameid, idioma, plegado), el de más peso. */
// REQ-351
export function buildAliasRows(cities: readonly CityRef[], names: Iterable<AltNameRow & { fuente?: "geonames" | "wikidata" }>): DestinoAlias[] {
  const byGeo = new Map<number, CityRef[]>();
  for (const c of cities) byGeo.set(c.geonameid, [...(byGeo.get(c.geonameid) ?? []), c]);
  const best = new Map<string, DestinoAlias>();
  const expanded = function* (all: Iterable<AltNameRow & { fuente?: "geonames" | "wikidata" }>) {
    for (const n of all) {
      yield n;
      // chino y japonés: «罗马市» / «京都市» → también «罗马» / «京都» (市 = ciudad), con un poco menos de peso
      if ((n.lang === "zh" || n.lang === "ja") && [...n.name].length >= 3 && n.name.endsWith("市")) yield { ...n, name: n.name.slice(0, -1), sinSufijo: true };
    }
  };
  for (const n of expanded(names) as Iterable<AltNameRow & { fuente?: "geonames" | "wikidata"; sinSufijo?: boolean }>) {
    const refs = byGeo.get(n.geonameid);
    if (!refs) continue;
    const aliasPlegado = fold(n.name);
    if (!aliasPlegado || aliasPlegado.length < 2) continue;
    for (const c of refs) {
      const row: DestinoAlias = {
        geonameid: n.geonameid, cityId: c.cityId, countryId: c.countryId, idioma: n.lang, alias: n.name, aliasPlegado,
        aliasAscii: toAscii(n.name), tipo: n.type, peso: WEIGHT[n.type] - (n.sinSufijo ? 5 : 0), fuente: n.fuente ?? "geonames",
      };
      const k = `${c.cityId}|${n.lang}|${aliasPlegado}`;
      const prev = best.get(k);
      if (!prev || row.peso > prev.peso) best.set(k, row);
    }
  }
  return [...best.values()].sort((a, b) => a.cityId - b.cityId || (a.idioma < b.idioma ? -1 : a.idioma > b.idioma ? 1 : 0) || b.peso - a.peso || (a.aliasPlegado < b.aliasPlegado ? -1 : 1));
}

/** Cobertura: cuántas ciudades tienen al menos un alias por idioma (el informe pide medir el/zh/ja/ko). */
// REQ-353
export function coverage(rows: readonly DestinoAlias[], totalCities: number): Record<string, { cities: number; pct: number }> {
  const out: Record<string, { cities: number; pct: number }> = {};
  for (const l of ALIAS_LANGS) {
    const n = new Set(rows.filter((r) => r.idioma === l).map((r) => r.cityId)).size;
    out[l] = { cities: n, pct: totalCities ? Math.round((n / totalCities) * 1000) / 10 : 0 };
  }
  return out;
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const CSV_HEAD = ["geonameid", "city_id", "country_id", "idioma", "alias", "alias_plegado", "alias_ascii", "tipo", "peso", "fuente"];
const csvCell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// REQ-352
export function aliasCsv(rows: readonly DestinoAlias[]): string {
  return [CSV_HEAD.join(","), ...rows.map((r) => [r.geonameid, r.cityId, r.countryId, r.idioma, r.alias, r.aliasPlegado, r.aliasAscii, r.tipo, r.peso, r.fuente].map(csvCell).join(","))].join("\n") + "\n";
}

/** SQL para revisar y, con OK del PO, aplicar en lotes. Idempotente (INSERT OR IGNORE sobre la llave única). */
// REQ-352
export function aliasSql(rows: readonly DestinoAlias[], batch = 200): string {
  const lines = [
    "-- ENSAYO (REQ-352): filas de destino_alias generadas offline desde GeoNames (CC BY 4.0) y Wikidata (CC0).",
    "-- NO APLICAR sin OK del PO (candado: datos de producción) y sin la migración de destino_alias aplicada.",
    "-- Idempotente: INSERT OR IGNORE sobre (city_id, idioma, alias_plegado).",
  ];
  for (let i = 0; i < rows.length; i += batch) {
    const values = rows.slice(i, i + batch).map((r) => `(${r.geonameid}, ${r.cityId}, ${r.countryId}, ${q(r.idioma)}, ${q(r.alias)}, ${q(r.aliasPlegado)}, ${q(r.aliasAscii)}, ${q(r.tipo)}, ${r.peso}, ${q(r.fuente)})`);
    lines.push(`INSERT OR IGNORE INTO "destino_alias" ("geonameid", "city_id", "country_id", "idioma", "alias", "alias_plegado", "alias_ascii", "tipo", "peso", "fuente") VALUES\n${values.join(",\n")};`);
  }
  return lines.join("\n") + "\n";
}

// ── Wikidata (CC0): etiquetas y alias por geonameid (P1566) ─────────────────────────────────────────────────

/** SPARQL: etiquetas y alias en los 14 idiomas de los ítems con esos geonameid. */
// REQ-350
export function wikidataAliasQuery(geonameids: readonly number[]): string {
  const values = [...new Set(geonameids)].map((g) => `"${g}"`).join(" ");
  const langs = ALIAS_LANGS.map((l) => `"${l}"`).join(", ");
  return [
    "SELECT ?gn ?label WHERE {",
    `  VALUES ?gn { ${values} }`,
    "  ?item wdt:P1566 ?gn .",
    "  { ?item rdfs:label ?label } UNION { ?item skos:altLabel ?label }",
    `  FILTER(LANG(?label) IN (${langs}) || STRSTARTS(LANG(?label), "zh-"))`,
    "}",
  ].join("\n");
}

/** Respuesta JSON de WDQS → nombres (tipo wikidata). Lo que no tenga forma válida se descarta. */
// REQ-350
export function parseWikidataAliases(json: unknown): (AltNameRow & { fuente: "wikidata" })[] {
  const b = (json as { results?: { bindings?: unknown[] } })?.results?.bindings;
  if (!Array.isArray(b)) return [];
  const out: (AltNameRow & { fuente: "wikidata" })[] = [];
  for (const x of b as Record<string, { value?: string; "xml:lang"?: string } | undefined>[]) {
    const geonameid = Number(x.gn?.value);
    const lang = baseLang(x.label?.["xml:lang"] ?? "");
    const name = (x.label?.value ?? "").trim();
    if (Number.isInteger(geonameid) && geonameid > 0 && lang && name && name.length <= 120) out.push({ geonameid, lang, name, type: "wikidata", fuente: "wikidata" });
  }
  return out;
}
