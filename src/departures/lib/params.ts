/** REQ-049: filtros de idioma del guía y fecha disponible desde la URL. Puro. */
import { addDays, HORIZON_DAYS } from "./summary";

export const GUIDE_LANGUAGE_OPTIONS = ["es", "en", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko", "nl", "pl"] as const;

// REQ-049
export function parseGuideLanguage(v: string | null | undefined): string | null {
  const l = (v ?? "").trim().toLowerCase();
  return (GUIDE_LANGUAGE_OPTIONS as readonly string[]).includes(l) ? l : null;
}

// REQ-049
export function parseTripDate(v: string | null | undefined, today: string): string | null {
  if (!v || !/^\d{4}-\d\d-\d\d$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return v >= today && v < addDays(today, HORIZON_DAYS) ? v : null;
}
