import type { TourRow, TranslationRow } from "@/catalog/lib/tour-rows";
import { LANGUAGES } from "@/catalog/lib/tour-rows";
import { durationMinutes } from "@/tours/lib/duration";
import type { TangolRate, TangolTour } from "./schemas";
import { publicPrice, type RatesSummary } from "./rates";
import { parseTourDetails } from "./details";
import { scrubProviderName } from "./text";
import { findProviderErrorValue } from "./data-hygiene";

/**
 * Ola 2 de Tangol: convierte un tour YA validado (`infoTourSchema`) en la fila de `Tour` y su traducción.
 * Pura: no toca base, R2 ni la visibilidad (gate C, REQ-1625) y recibe sus dependencias por parámetro.
 *
 * Qué campo de Tangol alimenta cada columna:
 *   TourId            → Tour.externalId      (con providerId "tangol"; la llave es (proveedor, número), REQ-1623)
 *   Name              → TourTranslation.title (limpio del nombre del proveedor, REQ-3372)
 *   TourDetails       → TourTranslation.description / brief y Tour.images (validado en `details.ts`)
 *   Duration          → Tour.duration (texto tal cual) y Tour.durationMinutes (minutos)
 *   RackRateAdu       → Tour.priceValue       (tarifa pública más baja; el neto, la comisión y `Utilidad` jamás entran)
 *   Currency (tarifas)→ Tour.priceCurrency
 *   UrlHomePic        → Tour.titleImageURL y primera imagen
 *   UrlTour           → NO se guarda: nunca se enlaza ni se nombra al proveedor
 *   cityId / countryId→ los entrega el mapeo de ciudades por parámetro (REQ-1624, otro frente)
 *   categoryId        → la entrega la taxonomía por parámetro (otro frente)
 */

export const TANGOL_PROVIDER_ID = "tangol";
/** Lo único que ve el cliente como «proveedor»: la marca propia. */
export const BRAND_TITLE = "Travel Puzzle";

type Lang = (typeof LANGUAGES)[number];

export interface TangolPlace {
  cityId: number;
  countryId: number;
}

export interface TangolTourRow extends TourRow {
  providerId: string;
}

export type DiscardReason =
  | "sin-ciudad"
  | "sin-titulo"
  | "sin-precio-publico"
  | "sin-moneda"
  | "dato-de-error-del-proveedor"
  | "error-inesperado";

export interface TangolRowDeps {
  /** Ciudad y país ya resueltos (REQ-1624, otro frente); `null` = sin ciudad válida → se descarta. */
  place: (tour: TangolTour) => TangolPlace | null;
  /** Tarifas públicas de `GetTourRates` ya resumidas; `null` = sin tarifas → se descarta. */
  rates: (tour: TangolTour) => RatesSummary | null;
  /** URL propia de Travel Puzzle para la traducción (nunca `UrlTour`). */
  url: (tour: TangolTour) => string;
  /** Categoría del catálogo (taxonomía, otro frente). */
  categoryId: (tour: TangolTour) => number;
  /** Idioma de la respuesta de Tangol: lo decide quien llama (los códigos 0-4 siguen sin confirmar, REQ-1546). */
  language: Lang;
  seenAt: Date;
  /** Moneda a usar cuando las tarifas no la declaran; sin ella, el tour se descarta. */
  fallbackCurrency?: string | null;
}

export type ConvertedRow =
  | { ok: true; tour: TangolTourRow; translations: TranslationRow[] }
  | { ok: false; reason: DiscardReason; detail?: string };

export interface TangolRowsBatch {
  rows: { tour: TangolTourRow; translations: TranslationRow[] }[];
  discarded: { tourId: number; reason: DiscardReason }[];
}

const DIACRITICS = /[̀-ͯ]/g;
/** Formatos de `Duration` que se han visto en Tangol, además de "H:MM" (el de Freetour). */
const UNITS: [RegExp, number][] = [
  [/(\d+(?:[.,]\d+)?)\s*(?:dias?|d)\b/, 1440],
  [/(\d+(?:[.,]\d+)?)\s*(?:horas?|hrs?|hs|h)\b/, 60],
  [/(\d+(?:[.,]\d+)?)\s*(?:minutos?|mins?|min|m)\b/, 1],
];

/** "3 Horas" → 180; "2:30" → 150; "2 Días" → 2880; lo que no se entiende → null (la columna acepta nulos). */
// REQ-3370
export function tangolDurationMinutes(value: string | null | undefined): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const hm = durationMinutes(raw);
  if (hm !== null) return hm;
  const text = raw.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
  let total = 0;
  for (const [re, factor] of UNITS) {
    const m = re.exec(text);
    if (m) total += Number(m[1].replace(",", ".")) * factor;
  }
  return total > 0 ? Math.round(total) : null;
}

/** La tarifa pública de adulto más baja (precio «desde»); una tarifa en cero no es precio. */
// REQ-3372
function cheapestPublicRate(summary: RatesSummary): TangolRate | null {
  return summary.rates.reduce<TangolRate | null>(
    (best, r) => (r.rackAdult > 0 && (best === null || r.rackAdult < best.rackAdult) ? r : best),
    null
  );
}

// REQ-3370, REQ-3371, REQ-3372, REQ-3504
export function toTangolTourRow(tour: TangolTour, deps: TangolRowDeps): ConvertedRow {
  // REQ-3504: un error del servidor de Tangol metido como dato tira el tour entero; no se adivina el valor.
  const junk = findProviderErrorValue(tour);
  if (junk) return { ok: false, reason: "dato-de-error-del-proveedor", detail: `${junk.field} = «${junk.value}»` };

  const place = deps.place(tour);
  if (!place) return { ok: false, reason: "sin-ciudad" };

  const title = scrubProviderName(tour.name);
  if (!title) return { ok: false, reason: "sin-titulo" };

  const summary = deps.rates(tour);
  const rate = summary ? cheapestPublicRate(summary) : null;
  if (!summary || !rate) return { ok: false, reason: "sin-precio-publico" };

  const price = publicPrice(rate);
  const currency = (price.currency ?? summary.currency ?? deps.fallbackCurrency ?? "").trim().toUpperCase();
  if (!currency) return { ok: false, reason: "sin-moneda" };

  const details = parseTourDetails(tour.details);
  const images: string[] = [];
  for (const url of [tour.homePic, ...details.images]) if (url && !images.includes(url)) images.push(url);

  const row: TangolTourRow = {
    providerId: TANGOL_PROVIDER_ID,
    externalId: tour.tourId,
    providerTitle: BRAND_TITLE,
    providerPhone: null,
    priceValue: price.adult,
    priceCurrency: currency,
    duration: tour.duration ?? "",
    durationMinutes: tangolDurationMinutes(tour.duration),
    titleImageURL: tour.homePic,
    categoryId: deps.categoryId(tour),
    // Tangol no manda calificación ni reseñas: la ficha no inventa números.
    rating: null,
    reviewsNumber: 0,
    cityId: place.cityId,
    countryId: place.countryId,
    // La lista de Tangol no trae punto de encuentro ni «incluye»; la columna no acepta nulos, así que van vacíos.
    meetingPoint: {},
    includes: [],
    POIs: null,
    images,
    videoURL: null,
    // Gate C (REQ-1625): se carga activo y el sitio lo oculta mientras `TANGOL_ENABLED` no sea "true".
    isActive: true,
    lastSeenAt: deps.seenAt,
  };

  const translations: TranslationRow[] = [
    {
      language: deps.language,
      title,
      brief: details.brief,
      description: details.description,
      url: deps.url(tour),
    },
  ];

  return { ok: true, tour: row, translations };
}

/** Convierte una lista: lo bueno pasa, lo malo se descarta con su motivo, se cuenta y se registra. */
// REQ-3371, REQ-3504
export function toTangolTourRows(tours: readonly TangolTour[], deps: TangolRowDeps): TangolRowsBatch {
  const rows: TangolRowsBatch["rows"] = [];
  const discarded: TangolRowsBatch["discarded"] = [];

  for (const tour of tours) {
    let result: ConvertedRow;
    try {
      result = toTangolTourRow(tour, deps);
    } catch (error) {
      console.warn(`[tangol] tour ${tour.tourId} descartado por un error al convertirlo: ${(error as Error).message}`);
      result = { ok: false, reason: "error-inesperado" };
    }
    if (result.ok) rows.push({ tour: result.tour, translations: result.translations });
    else {
      // REQ-3504: el motivo legible y el campo quedan en el log para poder reclamarlo al proveedor.
      if (result.detail) console.warn(`[tangol] tour ${tour.tourId} descartado (${result.reason}): ${result.detail}`);
      discarded.push({ tourId: tour.tourId, reason: result.reason });
    }
  }

  if (discarded.length > 0) {
    const byReason = discarded.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.reason]: (acc[d.reason] ?? 0) + 1 }), {});
    const detail = Object.entries(byReason)
      .map(([reason, n]) => `${reason}: ${n}`)
      .join(", ");
    console.warn(`[tangol] ${discarded.length} tour(es) descartados al armar las filas (${detail})`);
  }

  return { rows, discarded };
}
