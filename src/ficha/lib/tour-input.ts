/**
 * REQ-10843 · Frente 2 (Mila con acceso a todo, #422), decisión 40 (REQ-10617: «Mila ve e informa sobre los tours de
 * Tangol desde ya; para reservar manda a la ficha o a un asesor») y decisión 39 (REQ-10616: todo sobre el modelo común).
 * Arma la entrada del adaptador de Tangol (`adapters/tangol.ts`, REQ-10777) desde lo que ya guarda el sitio de un tour:
 * la fila de `Tour` con sus relaciones (traducciones del idioma, ciudad y país con sus JSON, como la devuelve
 * `getTourById`) y la fila de columnas prácticas 0031/0032 que se lee con SQL aparte (`tours/practical-load.ts`).
 * Es el mismo dato que ve la ficha pública de /destinos (paridad por construcción, decisión 3); nada se lee aquí.
 * - Traducción del idioma pedido; sin ella, español; sin ninguna, el título del proveedor.
 * - Taxonomía con el clasificador oficial (`catalogClassifier`) y el bloque con la decisión 11 según las banderas.
 * - Mapa: punto exacto del punto de encuentro; sin él, zona con las coordenadas de la ciudad (`fichaMapView`).
 * - Solo Tangol tiene adaptador hoy: otro proveedor devuelve null (FREETOUR nunca llega a Mila, decisión 42).
 * Puro: sin Prisma, sin `fetch`, sin `process.env` (banderas y clasificador llegan por parámetro).
 */
import { tangolToFicha, TANGOL, type TangolInput, type TangolRow } from "../adapters/tangol";
import type { TourOptionRecord } from "./option-records";
import type { FichaLang, FichaModel } from "./model";
import { taxonomyBlock, taxonomyBlockEnabled } from "@/taxonomy/lib/block";
import { catalogClassifier, type CatalogClassifier } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { fichaMapView, type GeoFlagsEnv } from "@/map/lib/city-pin";
import { parseCoords } from "@/map/lib/coords";
import { cityLabel } from "@/trips/cross-sell";
import { tourPath } from "@/destinations/lib/routes";
import { htmlToText } from "./text";

export interface TourTranslationRow { language: string; title: string | null; brief?: string | null; description?: string | null }

/** La fila de `Tour` con sus relaciones, como la devuelve `getTourById` (tras `scrubTourRow`). Solo lo que se usa. */
export interface TourRowWithRelations extends Omit<TangolRow, "whatToBring" | "physicalRequirements" | "difficulty" | "providerNotes" | "childAgeFrom" | "childAgeTo" | "excludes" | "cancellationPolicy" | "availabilityRules" | "guideLanguages" | "providerTitle"> {
  categoryId: number | null;
  providerTitle?: string | null;
  guideLanguages?: unknown;
  excludes?: unknown;
  cancellationPolicy?: string | null;
  availabilityRules?: unknown;
  translations: TourTranslationRow[];
  city: { slug: string | null; translations: unknown; lat?: number | null; lng?: number | null };
  country: { code: string; iso2: string | null; translations: unknown };
}

export interface TourFichaSource {
  tour: TourRowWithRelations;
  /** Columnas 0031/0032 leídas por SQL (`PRACTICAL_COLUMNS`); null si la base falló o la migración no está. */
  practical: Record<string, unknown> | null;
  /** REQ-10944: filas de `TourOption` (0036) leídas por SQL; sin ellas (o sin la migración) las opciones van sin precio. */
  options?: readonly TourOptionRecord[] | null;
}

export interface TourFichaOptions {
  lang: FichaLang;
  /** Banderas (`ZONE_MAP_ENABLED`, `TAXONOMY_BLOCK_ENABLED`, …); se pasan, no se leen aquí. */
  env: GeoFlagsEnv & { TAXONOMY_BLOCK_ENABLED?: string; TAXONOMY_PUBLISH_ENABLED?: string };
  /** Clasificador de la taxonomía; por defecto el oficial con el diccionario y los mapeos publicados. */
  classifier?: CatalogClassifier;
}

/** Junta la fila con la fila práctica (la práctica manda en lo que trae). */
// REQ-10843
export function tourFichaSource(tour: TourRowWithRelations, practical: Record<string, unknown> | null, options: readonly TourOptionRecord[] | null = null): TourFichaSource {
  return { tour, practical, options };
}

/** Ruta pública de la ficha, la misma de las tarjetas (`tourPath`); null si falta el slug del tour o de la ciudad. */
// REQ-10843
export function tourFichaPath(t: Pick<TourRowWithRelations, "slug" | "city" | "country">): string | null {
  const iso2 = (t.country.iso2 ?? "").trim().toLowerCase();
  if (!t.slug || !t.city.slug || !iso2) return null;
  return tourPath(iso2, t.city.slug, t.slug);
}

const pickTranslation = (rows: TourTranslationRow[], lang: string): TourTranslationRow | undefined =>
  rows.find((r) => r.language === lang && r.title) ?? rows.find((r) => r.language === "es" && r.title) ?? rows.find((r) => r.title);

const num = (v: unknown): number | null => { const n = typeof v === "string" ? Number(v) : v; return typeof n === "number" && Number.isFinite(n) ? n : null; };
/** Las columnas JSON leídas por SQL llegan como texto; por Prisma, ya como objeto. Texto que no es JSON, tal cual. */
const json = (v: unknown): unknown => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return v; } };

/** Entrada del adaptador de Tangol desde la fila guardada; null si el proveedor no es Tangol. Expuesta para probar cada pieza. */
// REQ-10843
export function tourFichaInput(s: TourFichaSource, o: TourFichaOptions): TangolInput | null {
  const t = s.tour;
  const providerId = (t.providerId ?? "").trim().toLowerCase();
  if (providerId !== TANGOL) return null;
  const p = s.practical ?? {};
  const tr = pickTranslation(t.translations ?? [], o.lang);
  const title = tr?.title ?? t.providerTitle ?? "";
  const cityName = cityLabel(t.city.translations, o.lang) ?? "";
  const iso2 = (t.country.iso2 ?? "").trim().toUpperCase();
  const row: TangolRow = {
    ...t,
    providerTitle: (p.providerTitle as string | null | undefined) ?? t.providerTitle ?? null,
    guideLanguages: json(p.guideLanguages) ?? t.guideLanguages ?? [],
    excludes: json(p.excludes) ?? t.excludes ?? [],
    cancellationPolicy: (p.cancellationPolicy as string | null | undefined) ?? t.cancellationPolicy ?? null,
    availabilityRules: json(p.availabilityRules) ?? t.availabilityRules ?? null,
    whatToBring: (p.whatToBring as string | null | undefined) ?? null,
    physicalRequirements: (p.physicalRequirements as string | null | undefined) ?? null,
    difficulty: (p.difficulty as string | null | undefined) ?? null,
    providerNotes: (p.providerNotes as string | null | undefined) ?? null,
    childAgeFrom: num(p.childAgeFrom),
    childAgeTo: num(p.childAgeTo),
  };
  const classifier = o.classifier ?? catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS);
  const languages = Array.isArray(row.guideLanguages) ? row.guideLanguages.map((l) => String(l)) : null;
  const cls = classifier({ providerId, categoryId: t.categoryId, price: num(t.priceValue), durationMinutes: t.durationMinutes, title: htmlToText(title), cities: cityName ? [cityName] : undefined, languages });
  return {
    row,
    translation: { title, brief: tr?.brief ?? null, description: tr?.description ?? null },
    city: { slug: t.city.slug ?? "", name: cityName },
    country: { code: iso2, name: cityLabel(t.country.translations, o.lang) ?? "" },
    lang: o.lang,
    taxonomy: taxonomyBlock({ formato: cls.formato, temas: (cls.temas ?? []) as Parameters<typeof taxonomyBlock>[0]["temas"], atributos: cls.atributos ?? [] }, { proveedor: providerId, lang: o.lang, decision11: taxonomyBlockEnabled(o.env) }),
    map: fichaMapView(parseCoords(t.meetingPoint?.coordinates ?? null), { lat: t.city.lat ?? null, lng: t.city.lng ?? null }, o.env),
    optionRecords: s.options ?? [], // REQ-10944
  };
}

/** Modelo de la ficha de un tour de Tangol (lo que `load.ts` valida después); null si no es Tangol. */
// REQ-10843
export function tourFichaModel(s: TourFichaSource, o: TourFichaOptions): FichaModel | null {
  const input = tourFichaInput(s, o);
  return input ? tangolToFicha(input) : null;
}
