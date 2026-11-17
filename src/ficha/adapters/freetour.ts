/**
 * REQ-10778 · Ola 6: adaptador de FREETOUR → modelo común (plan §2). Mismas entradas que Tangol (DIP: taxonomía y
 * mapa por parámetro). Reglas firmadas y de cumplimiento (skill cumplimiento-freetour):
 * - decisión 10: taxonomía con tipo y dos atributos (lo decide el bloque que llega); «En breve» oculto (REQ-570);
 * - el operador sigue visible como hoy hasta la revisión de cumplimiento (C4: título real y nombre del proveedor);
 * - free tour: sin precio (propina al guía), cancelación gratis hasta el inicio (D3); de pago: gratis hasta 24 h antes;
 * - cobra FREETOUR (D5), nunca Travel Puzzle; reserva por calendario (eventos en vivo, E2);
 * - texto del proveedor sin reescribir (C2): la descripción se sanea, no se edita.
 */
import type { FichaLang, FichaModel } from "../lib/model";
import type { TaxonomyBlock } from "@/taxonomy/lib/block";
import type { FichaMapView } from "@/map/lib/city-pin";
import { publicRating } from "../lib/rating-visibility";
import { underTitleOperator } from "../lib/operator";
import { isTravelerFavorite } from "@/tours/lib/favorite";
import { htmlToLines, htmlToText, sanitizeHtml } from "../lib/text";

export const FREETOUR = "freetour";
/** D3: tours de pago, gratis con reembolso hasta 24 h antes. */
export const FREETOUR_PAID_CANCEL_HOURS = 24;

export interface FreetourRow {
  id: string; externalId: number | string; providerId: string | null; slug: string | null; providerTitle: string | null;
  priceValue: number | string | null; priceCurrency: string | null; durationMinutes: number | null; titleImageURL: string | null;
  rating: number | string | null; reviewsNumber: number | null;
  meetingPoint: { title?: string | null; coordinates?: string | null } | null;
  includes: unknown; images: unknown; guideLanguages: unknown;
  providerNotes?: string | null;
}

export interface FreetourInput {
  row: FreetourRow;
  translation: { title: string; brief: string | null; description: string | null };
  city: { slug: string; name: string };
  country: { code: string; name: string };
  lang: FichaLang;
  taxonomy: TaxonomyBlock;
  map: FichaMapView | null;
}

const num = (v: unknown): number | null => { const n = typeof v === "string" ? Number(v) : v; return typeof n === "number" && Number.isFinite(n) ? n : null; };
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => htmlToText(String(x ?? ""))).filter(Boolean) : []);
/** `images` de FREETOUR viene como [{ id, URL }] (y a veces como lista de URL). */
const imageUrls = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : (x as { URL?: unknown })?.URL)).filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u)) : [];
/** La descripción de FREETOUR es texto plano con saltos de línea: cada bloque va en su párrafo, sin reescribir nada. */
const plainToHtml = (t: string | null): string | null => {
  const paras = (t ?? "").split(/\r?\n\s*\r?\n/).map((p) => htmlToText(p)).filter(Boolean);
  return paras.length ? paras.map((p) => `<p>${p}</p>`).join("") : null;
};

// REQ-10778
export function freetourToFicha(i: FreetourInput): FichaModel {
  const r = i.row;
  const providerId = r.providerId ?? FREETOUR;
  const { rating, reviews } = publicRating(providerId, num(r.rating), r.reviewsNumber ?? 0);
  const price = num(r.priceValue) ?? 0;
  const free = price <= 0;
  const gallery = imageUrls(r.images);
  const meetingTitle = htmlToText(r.meetingPoint?.title) || null;
  const descriptionHtml = /<[a-z][\s\S]*>/i.test(i.translation.description ?? "") ? sanitizeHtml(i.translation.description) : plainToHtml(i.translation.description);

  return {
    id: r.id, provider: FREETOUR, externalRef: String(r.externalId), code: null, slug: r.slug, lang: i.lang, section: "experiencias",
    country: i.country, city: i.city,
    gallery: (gallery.length ? gallery : r.titleImageURL ? [r.titleImageURL] : []).map((url) => ({ url, alt: null })),
    title: htmlToText(i.translation.title),
    rating: rating === null && reviews === 0 ? null : { value: rating, count: reviews, favorite: isTravelerFavorite({ rating, reviews }) },
    taxonomy: i.taxonomy,
    facts: { durationMinutes: r.durationMinutes && r.durationMinutes > 0 ? r.durationMinutes : null, schedule: null, languages: strs(r.guideLanguages).map((l) => l.toLowerCase()), season: null, difficulty: null, ages: null },
    brief: null, // REQ-570: «En breve» oculto en FREETOUR
    highlights: [],
    descriptionHtml,
    itinerary: [],
    includes: strs(r.includes),
    excludes: [],
    meeting: i.map?.kind === "exact" ? { kind: "exact", lat: i.map.lat, lng: i.map.lng, title: meetingTitle }
      : i.map?.kind === "zone" ? { kind: "zone", lat: i.map.lat, lng: i.map.lng, radiusM: i.map.radiusM, title: meetingTitle }
      : { kind: "none", title: meetingTitle },
    price: free ? null : { amount: price, currency: r.priceCurrency || "EUR", per: "person" },
    options: [],
    whatToBring: [],
    requirements: [],
    cancellation: free ? { hours: null, text: null } : { hours: FREETOUR_PAID_CANCEL_HOURS, text: null },
    notes: htmlToLines(r.providerNotes),
    operator: underTitleOperator(providerId, r.providerTitle),
    booking: { mode: "calendar", chargedBy: free ? "none" : "provider", leadHours: null },
  };
}
