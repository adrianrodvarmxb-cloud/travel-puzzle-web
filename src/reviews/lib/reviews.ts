import { z } from "zod";

/**
 * Reseñas reales de Freetour (GET /tours/{id}/reviews).
 * Funciones puras: validar la respuesta, decidir si la caché sigue vigente
 * y elegir qué reseñas mostrar. Nunca se inventan ni se editan reseñas.
 */
const zReview = z.object({
  id: z.number().int(),
  reviewerName: z.string(),
  language: z.string(),
  title: z.string().nullish(),
  content: z.string().nullish(),
  rate: z.number(),
  addedAt: z.string().nullish(),
});

const zResponse = z.object({
  data: z.union([
    z.array(zReview), // v.2.0
    z.object({ reviews: z.array(zReview), totalObjects: z.number().int() }), // v.2.1
  ]),
});

export interface Review {
  id: number;
  reviewerName: string;
  language: string;
  title: string | null;
  content: string | null;
  rate: number;
  addedAt: Date;
}

/** Freetour manda "2024-10-30 12:32:25" en UTC. */
function toDate(s: string | null | undefined): Date {
  if (!s) return new Date(0);
  const d = new Date(s.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export function parseReviewsResponse(body: unknown): { reviews: Review[]; totalObjects: number } {
  const { data } = zResponse.parse(body);
  const raw = Array.isArray(data) ? data : data.reviews;
  const reviews = raw.map((x) => ({
    id: x.id,
    reviewerName: x.reviewerName,
    language: x.language,
    title: x.title ?? null,
    content: x.content ?? null,
    rate: x.rate,
    addedAt: toDate(x.addedAt),
  }));
  return { reviews, totalObjects: Array.isArray(data) ? raw.length : data.totalObjects };
}

export const REVIEW_CACHE_DAYS = 7;

export function isCacheFresh(fetchedAt: Date | null, now: Date, days = REVIEW_CACHE_DAYS): boolean {
  return !!fetchedAt && now.getTime() - fetchedAt.getTime() < days * 24 * 60 * 60 * 1000;
}

const LANGUAGE_CODES: Record<string, string> = {
  English: "en", Spanish: "es", Portuguese: "pt", German: "de", French: "fr", Italian: "it",
};

export function languageCode(name: string): string | null {
  return LANGUAGE_CODES[name] ?? null;
}

/**
 * Elige qué reseñas mostrar: con comentario, de 4 estrellas o más,
 * primero las del idioma del visitante y después las demás; las más recientes primero.
 */
export function pickReviews(reviews: Review[], { lang, limit, minRate = 4 }: { lang: string; limit: number; minRate?: number }): Review[] {
  const usable = reviews
    .filter((r) => r.rate >= minRate && (r.content ?? "").trim().length > 0)
    .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  const own = usable.filter((r) => languageCode(r.language) === lang);
  const others = usable.filter((r) => languageCode(r.language) !== lang);
  return [...own, ...others].slice(0, limit);
}
