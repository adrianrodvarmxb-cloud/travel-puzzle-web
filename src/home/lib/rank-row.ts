/**
 * REQ-450, REQ-453: valida las filas de la base antes de rankearlas (CLAUDE.md, regla 8) y las vuelve candidatas.
 * Una fila mala se descarta y se cuenta; nunca tumba el carrusel. Puro.
 */
import { z } from "zod";
import { freetourFormat, isDayTripTour, tripFormat, isDayTripTrip } from "./experience-format";
import type { RankCandidate } from "./carousels";
import { titlesMentionBrand } from "./brand";

const num = z.union([z.number(), z.bigint(), z.string()]).transform((v) => Number(v)).pipe(z.number().finite());
const numOrNull = z.union([num, z.null()]);
const RowSchema = z.object({
  id: z.string().min(1),
  externalId: num,
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

export type TourCandidate = RankCandidate & { source: "tour"; id: string; externalId: number };

// REQ-450
export function parseTourRankRows(rows: readonly unknown[]): { ok: TourCandidate[]; dropped: number; branded: number } {
  const ok: TourCandidate[] = [];
  let dropped = 0;
  let branded = 0;
  for (const raw of rows) {
    const r = RowSchema.safeParse(raw);
    if (!r.success) { dropped++; continue; }
    const t = r.data;
    const titles = [t.titleEs, t.titleEn].filter((x): x is string => !!x);
    if (titlesMentionBrand(titles)) { branded++; continue; } // REQ-219 (REQ-454)
    const input = { categoryId: t.categoryId, price: t.price, durationMinutes: t.durationMinutes, titles };
    ok.push({
      source: "tour", id: t.id, externalId: t.externalId, key: `tour:${t.id}`,
      city: t.cityName ? normKey(t.cityName) : `city:${t.cityId}`, country: t.countryCode.toUpperCase(),
      format: freetourFormat(input), rating: t.rating, reviews: t.reviews, hasReviewSystem: true, dayTrip: isDayTripTour(input),
    });
  }
  return { ok, dropped, branded };
}

export interface TripLike {
  id: string; kind: string; durationDays: number | null; cities: string[]; countries: string[];
  titles?: string[];
  /** Ya calculado en el servidor (TripCard.dayTrip, con los títulos en es y en). */
  dayTrip?: boolean;
}
export type TripCandidate = RankCandidate & { source: "trip"; id: string };

/** REQ-453: viajes propios y de agencias como candidatas (hoy sin sistema de reseñas). */
export function tripCandidate(t: TripLike): TripCandidate {
  const input = { kind: t.kind, durationDays: t.durationDays, titles: t.titles ?? [] };
  const dayTrip = t.dayTrip ?? isDayTripTrip(input);
  return {
    source: "trip", id: t.id, key: `trip:${t.id}`,
    city: normKey(t.cities[0] ?? t.countries[0] ?? t.id), country: (t.countries[0] ?? "").toUpperCase(),
    format: dayTrip ? "excursion-dia" : tripFormat(input), rating: null, reviews: 0, hasReviewSystem: false, dayTrip,
  };
}
