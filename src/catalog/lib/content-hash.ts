import type { TourRow, TranslationRow } from "./tour-rows";

/**
 * Hash del contenido de un tour (REQ-073). La calificación, el número de reseñas
 * y los campos de la corrida no entran: así un cambio de calificación no cuenta
 * como cambio de contenido y correr el sync dos veces no escribe nada.
 */

/** Campos de TourRow que NO forman parte del contenido. */
export const HASH_EXCLUDED = ["rating", "reviewsNumber", "isActive", "lastSeenAt"] as const;

/** JSON con las llaves ordenadas (los arreglos conservan su orden). */
// REQ-073
export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

/** sha-256 (hex) del contenido del tour y sus traducciones. Usa Web Crypto (Workers y Node). */
// REQ-073
export async function contentHash({ tour, translations }: { tour: TourRow; translations: TranslationRow[] }): Promise<string> {
  const content: Record<string, unknown> = { ...tour };
  for (const k of HASH_EXCLUDED) delete content[k];
  const text = canonicalJson({ tour: content, translations });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type StageKind = "new" | "changed" | "rating" | "same";

export interface StoredTour {
  contentHash: string | null;
  rating: number | null;
  reviewsNumber: number;
}

/**
 * Qué hay que escribir de un tour del feed:
 * new = no existe; changed = otro contenido; rating = solo calificación/reseñas; same = nada.
 */
// REQ-073
export function classify(hash: string, incoming: { rating: number | null; reviewsNumber: number }, stored: StoredTour | undefined): StageKind {
  if (!stored) return "new";
  if (stored.contentHash !== hash) return "changed";
  if ((stored.rating ?? null) !== (incoming.rating ?? null) || stored.reviewsNumber !== incoming.reviewsNumber) return "rating";
  return "same";
}
