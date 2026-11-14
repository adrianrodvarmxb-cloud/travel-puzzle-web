/**
 * REQ-450, REQ-453: valida las filas de la base antes de rankearlas (CLAUDE.md, regla 8) y las vuelve candidatas.
 * Una fila mala se descarta y se cuenta; nunca tumba el carrusel. Puro.
 */
import { z } from "zod";
import { freetourFormat, isDayTripTour, tripFormat, isDayTripTrip } from "./experience-format";
import { DEFAULT_RANK_PROVIDER, type RankCandidate } from "./carousels";
import { titlesMentionBrand } from "./brand";
import { isPublishable, type CatalogClassifier } from "@/taxonomy/lib/publish";
import { catalogTourFormat } from "@/tours/lib/card-format";

const num = z.union([z.number(), z.bigint(), z.string()]).transform((v) => Number(v)).pipe(z.number().finite());
const numOrNull = z.union([num, z.null()]);
const RowSchema = z.object({
  id: z.string().min(1),
  externalId: num,
  /** REQ-10515: Tour.providerId; sin él (consultas viejas, null), freetour. */
  providerId: z.string().nullable().optional().transform((v) => (v && v.trim() ? v : DEFAULT_RANK_PROVIDER)),
  cityId: num,
  cityName: z.string().nullable().optional(),
  countryCode: z.string().min(2),
  categoryId: num,
  durationMinutes: numOrNull.optional().transform((v) => v ?? null),
  price: num,
  rating: numOrNull,
  reviews: num.pipe(z.number().int().min(0)),
  titleEs: z.string().nullable().optional(),
  titleEn: z.string().nullable().optional(),
});
export type TourRankRow = z.infer<typeof RowSchema>;

export const normKey = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export type TourCandidate = RankCandidate & { source: "tour"; id: string; externalId: number; providerId: string };

/** REQ-10515: entrada del clasificador de excursiones y del formato, con el proveedor de la fila. */
export interface RankRowInput { providerId: string; categoryId: number; price: number; durationMinutes: number | null; titles: string[] }

/**
 * REQ-10515: formato de la candidata. Con la taxonomía, el suyo (ya clasificado con el mapeo del proveedor). Sin ella,
 * FREETOUR sigue con la regla temporal de REQ-451 (nada cambia) y cualquier otro proveedor usa el clasificador de la
 * tarjeta con su mapeo (src/tours/lib/card-format.ts): así una categoría de Tangol (9000002…) no cae en «por-revisar».
 */
// REQ-10515
function rankFormat(input: RankRowInput, taxed?: { formato: string }): RankCandidate["format"] {
  if (taxed) return taxed.formato as RankCandidate["format"];
  return input.providerId === DEFAULT_RANK_PROVIDER ? freetourFormat(input) : catalogTourFormat(input, input.providerId);
}

// REQ-450
// REQ-270: con `taxonomy` (TAXONOMY_PUBLISH_ENABLED), lo que la taxonomía no publica (fuera, por-revisar) no entra y se cuenta.
// REQ-10515: la fila trae `providerId`; la taxonomía, el formato y la excursión se deciden con él.
export function parseTourRankRows(
  rows: readonly unknown[],
  opts: { taxonomy?: CatalogClassifier; /** REQ-858: qué es excursión de un día (por defecto, la regla REQ-451). */ isDayTrip?: (input: RankRowInput) => boolean } = {},
): { ok: TourCandidate[]; dropped: number; branded: number; untaxed: number } {
  const ok: TourCandidate[] = [];
  let dropped = 0;
  let branded = 0;
  let untaxed = 0;
  for (const raw of rows) {
    const r = RowSchema.safeParse(raw);
    if (!r.success) { dropped++; continue; }
    const t = r.data;
    const titles = [t.titleEs, t.titleEn].filter((x): x is string => !!x);
    if (titlesMentionBrand(titles)) { branded++; continue; } // REQ-219 (REQ-454)
    const taxed = opts.taxonomy?.({ providerId: t.providerId, categoryId: t.categoryId, price: t.price, durationMinutes: t.durationMinutes, title: titles.join(" | ") }); // REQ-10515: con el proveedor
    if (taxed && !isPublishable(taxed.formato)) { untaxed++; continue; }
    const input: RankRowInput = { providerId: t.providerId, categoryId: t.categoryId, price: t.price, durationMinutes: t.durationMinutes, titles };
    const format = rankFormat(input, taxed);
    // REQ-10515: sin regla propia, FREETOUR sigue con REQ-451 (gate C11); otro proveedor es excursión si su formato lo dice.
    const dayTrip = opts.isDayTrip ? opts.isDayTrip(input) : input.providerId === DEFAULT_RANK_PROVIDER ? isDayTripTour(input) : format === "excursion-dia";
    ok.push({
      source: "tour", id: t.id, externalId: t.externalId, key: `tour:${t.id}`, providerId: t.providerId,
      city: t.cityName ? normKey(t.cityName) : `city:${t.cityId}`, country: t.countryCode.toUpperCase(),
      format, rating: t.rating, reviews: t.reviews, hasReviewSystem: true, dayTrip,
    });
  }
  return { ok, dropped, branded, untaxed };
}

export interface TripLike {
  id: string; kind: string; durationDays: number | null; cities: string[]; countries: string[];
  titles?: string[];
  /** Ya calculado en el servidor (TripCard.dayTrip, con los títulos en es y en). */
  dayTrip?: boolean;
  /** REQ-10516: agencia dueña del viaje (TripCard.agencyId); sin ella, viaje propio. */
  agencyId?: string | null;
}
export type TripCandidate = RankCandidate & { source: "trip"; id: string; providerId: string };
/** REQ-10516: proveedor de los viajes propios en el tope por proveedor. */
export const OWN_TRIPS_PROVIDER = "propios";

/** REQ-453: viajes propios y de agencias como candidatas (hoy sin sistema de reseñas). */
export function tripCandidate(t: TripLike): TripCandidate {
  const input = { kind: t.kind, durationDays: t.durationDays, titles: t.titles ?? [] };
  const dayTrip = t.dayTrip ?? isDayTripTrip(input);
  return {
    source: "trip", id: t.id, key: `trip:${t.id}`, providerId: t.agencyId?.trim() || OWN_TRIPS_PROVIDER, // REQ-10516
    city: normKey(t.cities[0] ?? t.countries[0] ?? t.id), country: (t.countries[0] ?? "").toUpperCase(),
    format: dayTrip ? "excursion-dia" : tripFormat(input), rating: null, reviews: 0, hasReviewSystem: false, dayTrip,
  };
}
