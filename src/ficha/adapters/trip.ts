/**
 * REQ-10779 · Ola 6: adaptador de viajes de agencia y Big Bus (`Trip`) → modelo común (plan §2). Los textos llegan ya
 * resueltos al idioma (quien lee aplica `translations`); las fotos llegan como URL pública (quien lee resuelve la llave
 * de R2); el formato de taxonomía y la vista del mapa también llegan por parámetro (DIP).
 * Reglas firmadas: decisión 1 (Big Bus y todo traslado caen en Traslados), 38 (operador discreto), 34 (una sola
 * cancelación: el primer tramo con reembolso íntegro, si no, el texto resumido), 12 (dificultad 1–5 ya revisada en
 * `difficultyLevel`), código Travel Puzzle visible, itinerario por día en circuitos. Sin neto (REQ-10636): solo precios
 * finales que ya están en la fila pública.
 */
import type { FichaLang, FichaModel, FichaOption, FichaSection } from "../lib/model";
import type { TaxonomyBlock } from "@/taxonomy/lib/block";
import type { FichaMapView } from "@/map/lib/city-pin";
import { operatorLine } from "../lib/operator";
import { policySummary, type CancellationPolicy } from "@/trips/lib/cancel-policy";
import { htmlToLines, htmlToText, sanitizeHtml } from "../lib/text";
import { infoDepartureTime } from "@/trips/lib/trip-facts";

export const TRIP_PROVIDER = "propios";
/** Formatos de taxonomía que viven en la sección Traslados (decisión 1). */
export const TRANSFER_FORMATS = new Set(["transporte", "traslado"]);

export interface TripRow {
  id: string; slug: string; code: string; agencyId: string | null; kind: string; purchaseMode: string;
  durationDays: number | null; priceFrom: number | null; currency: string; priceNote: string;
  meetingPoints: unknown; hotelPickup: boolean | number; itinerary: unknown; includes: unknown; excludes: unknown;
  highlights: unknown; importantInfo: string; whatToBring: string; accessibility: string; difficultyLevel: number | null;
  languages: unknown; options: unknown; minNoticeHours: number; cancellation: unknown; endPoint: string;
  /** REQ-10898: mínimo de personas (dato del proveedor); opcional. */
  minPax?: number | null;
}

export interface TripInput {
  row: TripRow;
  /** Textos ya en el idioma pedido. */
  texts: { title: string; summary: string | null; description: string | null };
  gallery: { url: string; alt: string | null }[];
  /** Ciudad y país principales de la ficha (la primera ciudad del viaje). */
  city: { slug: string; name: string };
  country: { code: string; name: string };
  lang: FichaLang;
  taxonomy: TaxonomyBlock;
  /** Formato de `tripFormatDecision` (decide la sección). */
  format: string;
  map: FichaMapView | null;
  agencyName: string | null;
  /** REQ-10870: duración en las palabras del proveedor, ya en el idioma (la misma del marcado); opcional. */
  durationText?: string | null;
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => htmlToText(String(x ?? ""))).filter(Boolean) : []);
const level = (n: number | null): FichaModel["facts"]["difficulty"] => (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : null);

interface RawOption { id?: unknown; name?: unknown; adult?: unknown; childAgeMin?: unknown; childAgeMax?: unknown }
interface RawDay { title?: unknown; text?: unknown }
interface RawMeeting { name?: unknown; instructions?: unknown }

function cancellation(v: unknown): FichaModel["cancellation"] {
  const p = v as Partial<CancellationPolicy> | null;
  if (!p || typeof p !== "object" || !p.type) return null;
  const s = policySummary({ type: p.type, tiers: Array.isArray(p.tiers) ? p.tiers : [] });
  if (s.kind === "free") return { hours: "hours" in s ? s.hours : s.days * 24, text: null };
  return { hours: null, text: s.kind === "partial" ? "partial" : "none" };
}

// REQ-10779
export function tripToFicha(i: TripInput): FichaModel {
  const r = i.row;
  const section: FichaSection = TRANSFER_FORMATS.has(i.format) ? "traslados" : "experiencias";
  const options: FichaOption[] = (Array.isArray(r.options) ? (r.options as RawOption[]) : [])
    .filter((o) => typeof o.id === "string" && typeof o.name === "string")
    .map((o) => ({
      id: String(o.id), name: htmlToText(String(o.name)),
      price: typeof o.adult === "number" && o.adult > 0 ? { amount: o.adult, currency: r.currency, per: "person" } : null,
      transferIncluded: null, startTime: null,
    }));
  const days = (Array.isArray(r.itinerary) ? (r.itinerary as RawDay[]) : [])
    .map((d, n) => ({ day: n + 1, title: typeof d.title === "string" && d.title.trim() ? htmlToText(d.title) : null, text: htmlToText(typeof d.text === "string" ? d.text : "") }))
    .filter((d) => d.text);
  const first = Array.isArray(r.meetingPoints) ? (r.meetingPoints as RawMeeting[])[0] : undefined;
  const meetingTitle = first ? [first.name, first.instructions].filter((x): x is string => typeof x === "string" && x.trim() !== "").map(htmlToText).join(" · ") || null : null;
  const ages = options.length ? (r.options as RawOption[]).find((o) => typeof o.childAgeMin === "number" && typeof o.childAgeMax === "number") : undefined;

  return {
    id: r.id, provider: TRIP_PROVIDER, externalRef: r.code, code: r.code, slug: r.slug, lang: i.lang, section,
    country: i.country, city: i.city,
    gallery: i.gallery.filter((g) => /^https?:\/\//.test(g.url)),
    title: htmlToText(i.texts.title),
    rating: null,
    taxonomy: i.taxonomy,
    facts: {
      durationMinutes: r.durationDays && r.durationDays > 0 ? r.durationDays * 24 * 60 : null,
      durationText: i.durationText ?? null, // REQ-10870
      schedule: infoDepartureTime(r.importantInfo), // REQ-10898
      languages: strs(r.languages).map((l) => l.toLowerCase()),
      season: null,
      difficulty: level(r.difficultyLevel),
      ages: ages ? { childFrom: ages.childAgeMin as number, childTo: ages.childAgeMax as number } : null,
      minPax: typeof r.minPax === "number" && r.minPax > 0 ? r.minPax : null, // REQ-10898
    },
    brief: htmlToText(i.texts.summary) || null,
    highlights: strs(r.highlights),
    descriptionHtml: sanitizeHtml(/<[a-z][\s\S]*>/i.test(i.texts.description ?? "") ? i.texts.description : (i.texts.description ? `<p>${htmlToText(i.texts.description)}</p>` : null)),
    itinerary: days,
    includes: strs(r.includes),
    excludes: strs(r.excludes),
    meeting: i.map?.kind === "exact" ? { kind: "exact", lat: i.map.lat, lng: i.map.lng, title: meetingTitle }
      : i.map?.kind === "zone" ? { kind: "zone", lat: i.map.lat, lng: i.map.lng, radiusM: i.map.radiusM, title: meetingTitle }
      : { kind: "none", title: meetingTitle },
    price: typeof r.priceFrom === "number" && r.priceFrom > 0 ? { amount: r.priceFrom, currency: r.currency, per: "person" } : null,
    options: options.length > 1 ? options : [],
    whatToBring: htmlToLines(r.whatToBring),
    requirements: htmlToLines(r.accessibility),
    cancellation: cancellation(r.cancellation),
    notes: [...htmlToLines(r.importantInfo), ...(r.priceNote ? [htmlToText(r.priceNote)] : []), ...(r.endPoint ? [htmlToText(r.endPoint)] : [])],
    operator: operatorLine(r.agencyId ?? TRIP_PROVIDER, i.agencyName),
    booking: { mode: r.purchaseMode === "buy" ? "purchase" : "request", chargedBy: "travelpuzzle", leadHours: r.minNoticeHours > 0 ? r.minNoticeHours : null },
  };
}
