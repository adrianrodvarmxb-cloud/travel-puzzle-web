/**
 * Barrera de cordura del sync blindado (REQ-071). Pura: sin red ni base de datos.
 * Si algo no cuadra, la corrida se aborta sin tocar "Tour" y el sitio sigue
 * sirviendo el último catálogo bueno.
 */

/** Máximo que puede caer el número de tours frente a la última corrida exitosa. */
export const MAX_DROP = 0.2;

export type AbortReason = "empty" | "malformed" | "drop";

export type PageResult<T> =
  | { ok: true; tours: T[]; totalPages: number; dropped: number }
  | { ok: false; reason: AbortReason; detail: string };

const isTour = (t: unknown): t is { id: number } =>
  typeof t === "object" && t !== null && typeof (t as { id?: unknown }).id === "number";

/**
 * Valida la respuesta de GET /tours?page=N. Un registro sin id se descarta y se cuenta;
 * una respuesta sin forma válida o vacía aborta la corrida.
 */
// REQ-071
export function readPage<T = unknown>(body: unknown): PageResult<T> {
  const data = (body as { data?: { tours?: unknown; totalPages?: unknown } } | null)?.data;
  if (!data || !Array.isArray(data.tours) || typeof data.totalPages !== "number") {
    return { ok: false, reason: "malformed", detail: "la respuesta de /tours no trae data.tours y data.totalPages" };
  }
  const tours = data.tours.filter(isTour) as T[];
  if (data.totalPages <= 0 || tours.length === 0) {
    return { ok: false, reason: "empty", detail: `página vacía (totalPages=${data.totalPages}, tours=${tours.length})` };
  }
  return { ok: true, tours, totalPages: data.totalPages, dropped: data.tours.length - tours.length };
}

/** Al cerrar la corrida: ¿los tours vistos son suficientes frente a la última corrida exitosa? */
// REQ-071
export function checkRun({ seen, baseline }: { seen: number; baseline: number }): { ok: true } | { ok: false; reason: AbortReason; detail: string } {
  if (seen <= 0) return { ok: false, reason: "empty", detail: "la corrida no vio ningún tour" };
  if (baseline > 0 && seen < baseline * (1 - MAX_DROP)) {
    const pct = Math.round((1 - seen / baseline) * 1000) / 10;
    return { ok: false, reason: "drop", detail: `vio ${seen} tours, ${pct} % menos que la última corrida exitosa (${baseline})` };
  }
  return { ok: true };
}
