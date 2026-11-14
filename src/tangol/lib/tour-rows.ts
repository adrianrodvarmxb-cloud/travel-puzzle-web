import type { TourRow, TranslationRow } from "@/catalog/lib/tour-rows";
import { LANGUAGES } from "@/catalog/lib/tour-rows";
import { durationMinutes } from "@/tours/lib/duration";
import type { TangolRate, TangolTour } from "./schemas";
import { availabilityRules, publicPrice, type AvailabilityRules, type RatesSummary } from "./rates";
import { parseTourDetails } from "./details";
import { scrubProviderName } from "./text";
import { findProviderErrorValue } from "./data-hygiene";
import { normalizeCurrency } from "./currency";

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
 *   Currency (tarifas)→ Tour.priceCurrency (la que DEVUELVE Tangol; se le pide USD por omisión, REQ-10510)
 *   StartPoint        → Tour.meetingPoint.title (REQ-10511; sin coordenadas: Tangol no las manda)
 *   DetIncluye        → Tour.includes (renglones)      DetNoIncluye → Tour.excludes (columna de la 0031)
 *   CancelationPolicy → Tour.cancellationPolicy (0031)  TourLanguages → Tour.guideLanguages (ISO 639-1)
 *   EndPoint, WhatToBring, PhysicalReq, Difficulty, Others, ChdFrom/To, InfFrom/To → columnas de la 0032 (REQ-10537/10538)
 *   (proveedor)       → Tour.providerTitle = «Tangol Tours» (REQ-10542: dice quién opera)
 *   Reviews/ReviewsQty→ Tour.rating / Tour.reviewsNumber (solo reseñas reales, REQ-450)
 *   OperationDays, HoursBooking, vigencias y bloqueos (tarifas) → Tour.availabilityRules (0031, REQ-10513)
 *   UrlHomePic        → Tour.titleImageURL y primera imagen
 *   UrlTour           → NO se guarda: nunca se enlaza ni se nombra al proveedor
 *   cityId / countryId→ los entrega el mapeo de ciudades por parámetro (REQ-1624, otro frente)
 *   categoryId        → la entrega la taxonomía por parámetro (otro frente)
 */

export const TANGOL_PROVIDER_ID = "tangol";
/**
 * Antes (REQ-10511) la casilla «Proveedor» decía la marca propia. Se conserva sin usar (no se borra código):
 * la decisión quedó REEMPLAZADA por REQ-10542.
 */
export const BRAND_TITLE = "Travel Puzzle";
/**
 * REQ-10542 (PO, 13 nov 2026 22:47/22:50: «así deben decir los de Tangol», «así todos dicen quien opera hasta lo
 * freetour»): la casilla «Proveedor» dice quién opera, igual que FREETOUR muestra a su operador. Solo el nombre:
 * sin teléfono, correo ni URL del proveedor (REQ-10540, cláusula 7.2).
 */
// REQ-10542
export const TANGOL_OPERATOR_TITLE = "Tangol Tours";

type Lang = (typeof LANGUAGES)[number];

export interface TangolPlace {
  cityId: number;
  countryId: number;
}

export interface TangolTourRow extends TourRow {
  providerId: string;
  /** REQ-10511/REQ-10512: columnas de la migración 0031 y `guideLanguages`; las escribe `tangolExtraStatements`. */
  excludes: string[];
  cancellationPolicy: string | null;
  availabilityRules: AvailabilityRules | null;
  guideLanguages: string[];
  /** REQ-10537 / REQ-10538: columnas de la migración 0032 (una por dato, gate A). */
  endPoint: string | null;
  whatToBring: string | null;
  physicalRequirements: string | null;
  difficulty: string | null;
  providerNotes: string | null;
  childAgeFrom: number | null;
  childAgeTo: number | null;
  infantAgeFrom: number | null;
  infantAgeTo: number | null;
}

export type DiscardReason =
  | "sin-ciudad"
  | "sin-titulo"
  | "sin-precio-publico"
  | "sin-moneda"
  | "moneda-desconocida"
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

// REQ-3370, REQ-3371, REQ-3372, REQ-3504, REQ-10510, REQ-10511, REQ-10513, REQ-10537, REQ-10538, REQ-10542, REQ-10543
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
  // REQ-10543: el código crudo (el de la tarifa, el del encabezado o el de respaldo) se normaliza con un mapa
  // explícito (1 → USD); uno desconocido no se adivina: el tour se descarta y queda en el reporte.
  const rawCurrency = [price.currency, summary.currency, deps.fallbackCurrency].map((c) => (c ?? "").trim()).find(Boolean) ?? "";
  if (!rawCurrency) return { ok: false, reason: "sin-moneda" };
  const currency = normalizeCurrency(rawCurrency);
  if (!currency) return { ok: false, reason: "moneda-desconocida", detail: `moneda «${rawCurrency}»` };

  const details = parseTourDetails(tour.details);
  const images: string[] = [];
  for (const url of [tour.homePic, ...details.images]) if (url && !images.includes(url)) images.push(url);

  const row: TangolTourRow = {
    providerId: TANGOL_PROVIDER_ID,
    externalId: tour.tourId,
    providerTitle: TANGOL_OPERATOR_TITLE, // REQ-10542
    providerPhone: null,
    priceValue: price.adult,
    priceCurrency: currency,
    duration: tour.duration ?? "",
    durationMinutes: tangolDurationMinutes(tour.duration),
    titleImageURL: tour.homePic,
    categoryId: deps.categoryId(tour),
    // REQ-10511: solo reseñas reales (≥ 1 y entre 1 y 5); si no, la ficha no inventa números.
    rating: details.rating,
    reviewsNumber: details.reviewsNumber,
    cityId: place.cityId,
    countryId: place.countryId,
    // REQ-10511: misma forma que Freetour; sin coordenadas la ficha muestra el texto y no el mapa. Sin detalle, vacío (la columna no acepta nulos).
    meetingPoint: details.startPoint ? { title: details.startPoint, coordinates: "", googlePlaceId: "" } : {},
    includes: details.includes,
    POIs: null,
    images,
    videoURL: null,
    // Gate C (REQ-1625): se carga activo y el sitio lo oculta mientras `TANGOL_ENABLED` no sea "true".
    isActive: true,
    lastSeenAt: deps.seenAt,
    // REQ-10511 / REQ-10513: columnas de la 0031 (las escribe el repositorio aparte del UPSERT de Tour).
    excludes: details.excludes,
    cancellationPolicy: details.cancellationPolicy,
    availabilityRules: availabilityRules(summary),
    guideLanguages: details.languages,
    // REQ-10537 / REQ-10538: columnas de la 0032.
    endPoint: details.endPoint,
    whatToBring: details.whatToBring,
    physicalRequirements: details.physicalRequirements,
    difficulty: details.difficulty,
    providerNotes: details.providerNotes,
    childAgeFrom: details.childAges?.from ?? null,
    childAgeTo: details.childAges?.to ?? null,
    infantAgeFrom: details.infantAges?.from ?? null,
    infantAgeTo: details.infantAges?.to ?? null,
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
