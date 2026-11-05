/** Lo mínimo para publicar (gate J; REQ-043: basta 1 foto, la galería se acomoda con REQ-042). Puro. */
import type { TripKind } from "./trip";
import type { TripOption } from "./pricing";

export const MIN_PHOTOS = 1; // REQ-043 (antes 5): sin fotos de relleno
export const MAX_TITLE = 60;

export interface PublishInput {
  kind: TripKind;
  titleEs: string;
  summaryEs: string;
  descriptionEs: string;
  highlights: string[];
  includes: string[];
  excludes: string[];
  countries: string[];
  durationDays: number | null;
  languages: string[];
  options: TripOption[];
  meetingPoints: { lat: number | null; lng: number | null }[];
  images: unknown[];
}

export function publishChecklist(t: PublishInput): string[] {
  const m: string[] = [];
  const custom = t.kind === "personalizado";
  if (!t.titleEs.trim()) m.push("título");
  else if (t.titleEs.trim().length > MAX_TITLE) m.push(`título de máximo ${MAX_TITLE} caracteres`);
  if (!t.summaryEs.trim()) m.push("resumen");
  if (t.highlights.length < 3 || t.highlights.length > 5) m.push("3 a 5 puntos destacados");
  if (!t.descriptionEs.trim()) m.push("descripción");
  if (!t.includes.length) m.push("qué incluye");
  if (!t.excludes.length) m.push("qué no incluye");
  if (!t.countries.length) m.push("al menos un país");
  if (!t.durationDays) m.push("duración");
  if (!custom && !t.options.some((o) => (o.adult ?? 0) > 0)) m.push("al menos una opción con precio adulto");
  if (!custom && !t.meetingPoints.some((p) => p.lat !== null && p.lng !== null)) m.push("punto de encuentro con ubicación en el mapa");
  if (!t.languages.length) m.push("idiomas del guía");
  if (t.images.length < MIN_PHOTOS) m.push(`al menos ${MIN_PHOTOS} foto${MIN_PHOTOS === 1 ? "" : "s"} (tienes ${t.images.length})`);
  return m;
}
