/**
 * Viajes propios y de agencias (punto 17, ola 1). Funciones puras del gestor.
 * Gates firmados en docs/gates-viajes-propios-2026-11.md.
 */
export const TRIP_KINDS = ["tour", "circuito", "unica", "personalizado", "transporte"] as const;
export const PURCHASE_MODES = ["quote", "buy"] as const;
/** REQ-3535: "unlisted" = se abre solo con su enlace (no sale en listados, búsqueda, mapa ni sitemap; noindex). */
export const TRIP_STATUSES = ["draft", "published", "hidden", "unlisted"] as const;
export const CURRENCIES = ["MXN", "USD", "EUR"] as const;
export const MAX_TIMES_PER_DAY = 4;
export const MAX_MEETING_POINTS = 4;

export type TripKind = (typeof TRIP_KINDS)[number];
export type PurchaseMode = (typeof PURCHASE_MODES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type Currency = (typeof CURRENCIES)[number];

export const KIND_LABEL: Record<TripKind, string> = { tour: "Tour", circuito: "Circuito", unica: "Experiencia única", personalizado: "Personalizado", transporte: "Transporte" };
export const STATUS_LABEL: Record<TripStatus, string> = { draft: "Borrador", published: "Publicado", hidden: "Oculto", unlisted: "Solo con enlace" };

// REQ-3535: la ficha y la compra abren publicados y «solo con enlace»; los listados siguen pidiendo "published".
export function isPubliclyReachable(status: string): boolean {
  return status === "published" || status === "unlisted";
}

export interface TripDate { date: string; times: string[] }

/** Lo mínimo que se revisa para publicar. */
export interface TripDraft {
  code: string;
  kind: TripKind;
  purchaseMode: PurchaseMode;
  titleEs: string;
  countries: string[];
  priceFrom: number | null;
  currency: Currency;
  images: { key: string; alt: string }[];
}

/** "Ruta Australia ¡Cosmopolita!" + "PATP" → "ruta-australia-cosmopolita-patp". */
export function slugify(title: string, code: string): string {
  return `${title} ${code}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ordena y junta fechas; máximo 4 horarios por día (gestor de viajes del documento 2024). */
export function normalizeDates(dates: TripDate[]): { ok: true; dates: TripDate[] } | { ok: false; error: string } {
  const byDate = new Map<string, Set<string>>();
  for (const d of dates) {
    if (!DATE_RE.test(d.date)) return { ok: false, error: `Fecha inválida: ${d.date}` };
    const set = byDate.get(d.date) ?? new Set<string>();
    for (const t of d.times) {
      if (!TIME_RE.test(t)) return { ok: false, error: `Horario inválido: ${t}` };
      set.add(t);
    }
    byDate.set(d.date, set);
  }
  const out: TripDate[] = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, set]) => ({ date, times: [...set].sort() }));
  const full = out.find((d) => d.times.length > MAX_TIMES_PER_DAY);
  if (full) return { ok: false, error: `Máximo ${MAX_TIMES_PER_DAY} horarios el ${full.date}` };
  return { ok: true, dates: out };
}

/** Qué falta para poder publicar (lista vacía = listo). Los personalizados se cotizan, no llevan precio. */
export function missingToPublish(t: TripDraft): string[] {
  const missing: string[] = [];
  if (!t.titleEs.trim()) missing.push("título");
  if (!t.countries.length) missing.push("al menos un país");
  if (!t.images.length) missing.push("al menos una foto");
  if (t.kind !== "personalizado" && (t.priceFrom === null || t.priceFrom <= 0)) missing.push("precio desde");
  return missing;
}
