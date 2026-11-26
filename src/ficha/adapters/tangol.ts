/**
 * REQ-10777 · Ola 6: adaptador de Tangol → modelo común de la ficha (plan §2, «fila de Tour → modelo (puro)»).
 * Entrada: la fila de `Tour` con sus columnas prácticas (0031/0032), la traducción del idioma pedido, ciudad y país,
 * más lo que ya deciden otras piezas puras y llega por parámetro (DIP): el bloque de taxonomía y la vista del mapa.
 * Reglas firmadas que aplica: nota oculta (decisión 18), operador discreto (38), una sola cancelación (34),
 * dificultad 1–5 (12), marca blanca (REQ-10540: sin teléfonos ni correos), nada inventado (dato ausente → null/[]).
 */
import type { FichaLang, FichaModel, FichaOption } from "../lib/model";
import type { TaxonomyBlock } from "@/taxonomy/lib/block";
import type { FichaMapView } from "@/map/lib/city-pin";
import { publicRating } from "../lib/rating-visibility";
import { operatorLine } from "../lib/operator";
import { singleCancellation } from "../lib/cancellation";
import { transferAddonFromOptions } from "../lib/addons";
import { isTravelerFavorite } from "@/tours/lib/favorite";
import { dificultadDesdeTexto } from "@/taxonomy/lib/difficulty";
import { htmlToLines, htmlToText, sanitizeHtml } from "../lib/text";

export const TANGOL = "tangol";

export interface TangolRow {
  id: string; externalId: number | string; providerId: string; slug: string | null; providerTitle: string | null;
  priceValue: number | string | null; priceCurrency: string | null; durationMinutes: number | null; titleImageURL: string | null;
  rating: number | string | null; reviewsNumber: number | null;
  meetingPoint: { title?: string | null; coordinates?: string | null } | null;
  includes: unknown; images: unknown; guideLanguages: unknown; excludes: unknown;
  cancellationPolicy: string | null; availabilityRules: unknown;
  whatToBring: string | null; physicalRequirements: string | null; difficulty: string | null; providerNotes: string | null;
  childAgeFrom: number | null; childAgeTo: number | null;
}

export interface TangolInput {
  row: TangolRow;
  translation: { title: string; brief: string | null; description: string | null };
  city: { slug: string; name: string };
  country: { code: string; name: string };
  lang: FichaLang;
  taxonomy: TaxonomyBlock;
  map: FichaMapView | null;
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => htmlToText(String(x ?? ""))).filter(Boolean) : []);
const num = (v: unknown): number | null => { const n = typeof v === "string" ? Number(v) : v; return typeof n === "number" && Number.isFinite(n) ? n : null; };

interface Rule { code?: unknown; startTime?: unknown; hoursBooking?: unknown; hoursCancelation?: unknown }
const rules = (v: unknown): Rule[] => (v && typeof v === "object" && Array.isArray((v as { options?: unknown }).options) ? ((v as { options: Rule[] }).options) : []);

// REQ-10777
export function tangolToFicha(i: TangolInput): FichaModel {
  const r = i.row;
  const { rating, reviews } = publicRating(r.providerId, num(r.rating), r.reviewsNumber ?? 0);
  const opts = rules(r.availabilityRules);
  const options: FichaOption[] = opts
    .filter((o) => typeof o.code === "string" || typeof o.code === "number")
    .map((o) => ({ id: String(o.code), name: typeof o.startTime === "string" ? `${i.translation.title} · ${o.startTime}` : i.translation.title, price: null, transferIncluded: null, startTime: typeof o.startTime === "string" ? o.startTime : null }));
  const starts = [...new Set(options.map((o) => o.startTime).filter((s): s is string => !!s))];
  const lead = opts.map((o) => num(o.hoursBooking)).filter((n): n is number => n !== null && n > 0);
  const cancel = singleCancellation({ structuredHours: opts.map((o) => num(o.hoursCancelation)), text: r.cancellationPolicy });
  const dif = dificultadDesdeTexto(r.difficulty ?? r.physicalRequirements);
  const price = num(r.priceValue);
  const meetingTitle = htmlToText(r.meetingPoint?.title) || null;
  const gallery = strs(r.images).filter((u) => /^https?:\/\//.test(u));
  const ages = r.childAgeFrom !== null && r.childAgeTo !== null && r.childAgeTo >= r.childAgeFrom ? { childFrom: r.childAgeFrom, childTo: r.childAgeTo } : null;

  return {
    id: r.id, provider: TANGOL, externalRef: String(r.externalId), code: null, slug: r.slug, lang: i.lang, section: "experiencias",
    providerId: r.providerId ?? TANGOL, // REQ-10889
    country: i.country, city: i.city,
    gallery: (gallery.length ? gallery : r.titleImageURL ? [r.titleImageURL] : []).map((url) => ({ url, alt: null })),
    title: htmlToText(i.translation.title),
    rating: rating === null && reviews === 0 ? null : { value: rating, count: reviews, favorite: isTravelerFavorite({ rating, reviews }) },
    taxonomy: i.taxonomy,
    facts: {
      durationMinutes: r.durationMinutes && r.durationMinutes > 0 ? r.durationMinutes : null,
      schedule: starts.length ? starts.join(" · ") : null,
      languages: strs(r.guideLanguages).map((l) => l.toLowerCase()),
      season: null,
      difficulty: dif?.nivel ?? null,
      ages,
    },
    brief: htmlToText(i.translation.brief) || null,
    highlights: [],
    descriptionHtml: sanitizeHtml(i.translation.description),
    itinerary: [],
    includes: strs(r.includes),
    excludes: strs(r.excludes),
    meeting: i.map?.kind === "exact" ? { kind: "exact", lat: i.map.lat, lng: i.map.lng, title: meetingTitle }
      : i.map?.kind === "zone" ? { kind: "zone", lat: i.map.lat, lng: i.map.lng, radiusM: i.map.radiusM, title: meetingTitle }
      : { kind: "none", title: meetingTitle },
    price: price !== null && price > 0 && r.priceCurrency ? { amount: price, currency: r.priceCurrency, per: "person" } : null,
    options: options.length > 1 ? options : [],
    // REQ-10881 (ola 12): el traslado como adicional, solo cuando las opciones traen precio y dato de traslado (hoy no: []).
    addons: [transferAddonFromOptions(options, i.lang)].filter((a): a is NonNullable<typeof a> => a !== null),
    whatToBring: htmlToLines(r.whatToBring),
    requirements: htmlToLines(r.physicalRequirements),
    cancellation: cancel.hours === null && !cancel.text ? null : cancel,
    notes: htmlToLines(r.providerNotes),
    operator: operatorLine(r.providerId, r.providerTitle),
    booking: { mode: "request", chargedBy: "travelpuzzle", leadHours: lead.length ? Math.max(...lead) : null },
  };
}
