/**
 * REQ-10944 · Ola 12, PR 2 (decisión A del PO, 26 nov 2026): una fila de `TourOption` (migración 0036) por opción de
 * Tangol, con su tarifa PÚBLICA de adulto más baja (`RackRateAdu`; el neto, la comisión y `Utilidad` ya no existen
 * aquí: los descarta `parseTourRates`, REQ-1543) y su dato de traslado leído de la descripción (REQ-10883). Pura:
 * solo recibe el resumen de tarifas y la moneda del tour; no escribe nada (las sentencias van en `option-sql.ts`).
 */
import type { RatesSummary } from "./rates";
import { transferFromDescription } from "./option-transfer";
import { normalizeCurrency } from "./currency";

export interface TourOptionRow {
  code: string;
  description: string | null;
  startTime: string | null;
  /** ISO 4217 de la tarifa pública; null si la opción no trae tarifa. */
  currency: string | null;
  /** Tarifa pública de adulto más baja de la opción; null si no trae tarifa (una tarifa en cero no es precio). */
  rackAdult: number | null;
  /** true = con traslado, false = sin traslado, null = el proveedor no lo dice (REQ-10883). */
  transferIncluded: boolean | null;
  hoursBooking: number | null;
  hoursCancelation: number | null;
}

/**
 * Filas de opciones desde el resumen de tarifas. `tourCurrency` es la moneda ya normalizada del tour (la de la
 * tarifa «desde»); se usa cuando la tarifa de la opción no declara la suya. Opciones con código repetido: queda la
 * primera. El orden de Tangol se respeta.
 */
// REQ-10944
export function tourOptionRows(summary: Pick<RatesSummary, "options" | "rates">, tourCurrency: string | null): TourOptionRow[] {
  const seen = new Set<string>();
  const out: TourOptionRow[] = [];
  for (const o of summary.options) {
    const code = o.code.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const rates = summary.rates.filter((r) => r.option === o.code && r.rackAdult > 0);
    const best = rates.reduce<(typeof rates)[number] | null>((b, r) => (b === null || r.rackAdult < b.rackAdult ? r : b), null);
    const raw = (best?.currency ?? "").trim();
    const currency = best ? (raw ? normalizeCurrency(raw) : null) ?? tourCurrency : null;
    out.push({
      code,
      description: o.description?.trim() || null,
      startTime: o.startTime?.trim() || null,
      currency,
      rackAdult: best && currency ? best.rackAdult : null,
      transferIncluded: transferFromDescription(o.description),
      hoursBooking: o.hoursBooking ?? null,
      hoursCancelation: o.hoursCancelation ?? null,
    });
  }
  return out;
}
