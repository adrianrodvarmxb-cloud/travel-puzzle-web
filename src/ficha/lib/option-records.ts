/**
 * REQ-10944 · Ola 12, PR 2, paso 3: la ficha pone precio y traslado a cada opción de Tangol desde las filas de
 * `TourOption` (migración 0036) leídas con SQL aparte (`tours/options-load.ts`). Lo que llega ya es tarifa PÚBLICA
 * (la tabla no tiene neto ni comisión, REQ-1543). Sin filas, o con una opción sin fila, la opción queda como hoy
 * (precio null, traslado null): nunca se inventa. Puro.
 */
import type { FichaOption, FichaPrice } from "./model";

export interface TourOptionRecord {
  code: string;
  description: string | null;
  startTime: string | null;
  currency: string | null;
  rackAdult: number | null;
  /** 1 / 0 / null en D1 (o booleano si ya viene convertido). */
  transferIncluded: boolean | number | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => { const n = typeof v === "string" ? Number(v) : v; return typeof n === "number" && Number.isFinite(n) ? n : null; };

/** Una fila cruda de `TourOption` (SQL) al registro tipado; sin `code`, null. */
// REQ-10944
export function tourOptionRecord(raw: unknown): TourOptionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const code = str(r.code);
  if (!code) return null;
  const t = r.transferIncluded;
  return {
    code,
    description: str(r.description),
    startTime: str(r.startTime),
    currency: str(r.currency)?.toUpperCase() ?? null,
    rackAdult: num(r.rackAdult),
    transferIncluded: t === true || t === 1 ? true : t === false || t === 0 ? false : null,
  };
}

const priceOf = (rec: TourOptionRecord): FichaPrice | null =>
  rec.rackAdult !== null && rec.rackAdult > 0 && rec.currency ? { amount: rec.rackAdult, currency: rec.currency, per: "person" } : null;

/**
 * Opciones de la ficha con precio y traslado desde sus registros, cruzadas por código. Una opción sin registro no
 * cambia; un registro sin opción (código que las reglas de disponibilidad no traen) se suma al final, con el nombre
 * del tour y su hora, para que la opción con tarifa no se pierda. El orden de las opciones se respeta.
 */
// REQ-10944
export function optionsWithRecords(options: readonly FichaOption[], records: readonly TourOptionRecord[], title: string): FichaOption[] {
  const byCode = new Map(records.map((r) => [r.code, r]));
  const out: FichaOption[] = options.map((o) => {
    const rec = byCode.get(o.id);
    if (!rec) return o;
    const transfer = rec.transferIncluded === null ? o.transferIncluded : rec.transferIncluded;
    return { ...o, price: priceOf(rec) ?? o.price, transferIncluded: typeof transfer === "boolean" ? transfer : null, startTime: o.startTime ?? rec.startTime };
  });
  const seen = new Set(options.map((o) => o.id));
  for (const rec of records) {
    if (seen.has(rec.code)) continue;
    seen.add(rec.code);
    out.push({ id: rec.code, name: rec.startTime ? `${title} · ${rec.startTime}` : title, price: priceOf(rec), transferIncluded: typeof rec.transferIncluded === "boolean" ? rec.transferIncluded : null, startTime: rec.startTime });
  }
  return out;
}
