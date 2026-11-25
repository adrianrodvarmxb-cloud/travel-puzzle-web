/**
 * REQ-10874 · Ficha única, ola 9 (plan §7: «tipos de cambio»). Fuente firmada por el PO en REQ-10767 (17-11-2026,
 * «A: Frankfurter / BCE (Recomendado)»): Frankfurter (tasas de referencia del BCE, sin llave) complementa a Banxico,
 * que sigue mandando para MXN/USD/EUR. Aquí solo lo puro: leer la respuesta de Frankfurter y mezclar las dos fuentes
 * en una sola tabla (`FxTable` de `local-price.ts`). Nunca inventa una tasa: lo que falta queda fuera y `localPrice`
 * no convierte (REQ-10823).
 */
import type { FxTable } from "@/ficha/lib/local-price";
import { fxTableFromMxn } from "@/ficha/lib/local-price";
import type { FxRates } from "@/trips/lib/money";

/** Respuesta de `GET /v1/latest?base=EUR` de Frankfurter → tabla con base EUR; null si no trae base, fecha o tasas. */
// REQ-10874
export function parseFrankfurter(json: unknown): FxTable | null {
  if (!json || typeof json !== "object") return null;
  const j = json as { base?: unknown; date?: unknown; rates?: unknown };
  if (typeof j.base !== "string" || !/^[A-Z]{3}$/.test(j.base) || typeof j.date !== "string" || !j.date) return null;
  if (!j.rates || typeof j.rates !== "object") return null;
  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries(j.rates as Record<string, unknown>)) {
    if (/^[A-Z]{3}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v > 0) rates[k] = v;
  }
  return { base: j.base, date: j.date, rates };
}

/**
 * Una sola tabla para `localPrice`:
 * - con Banxico: base MXN; USD y EUR «por un peso» salen de Banxico (REQ-10767: Banxico manda para MXN/USD/EUR) y
 *   cada otra moneda C de Frankfurter se deriva por el EUR de Banxico (1 MXN = 1/EUR_mxn EUR = C_eur/EUR_mxn C);
 *   sin EUR válido de Banxico no hay puente y las demás monedas quedan fuera;
 * - sin Banxico: la tabla de Frankfurter tal cual (base EUR, trae MXN y USD);
 * - sin ninguna: null (no se convierte).
 */
// REQ-10874
export function mergeFxTables(banxico: FxRates | null | undefined, frankfurter: FxTable | null | undefined): FxTable | null {
  const base = fxTableFromMxn(banxico);
  if (!base) return frankfurter ?? null;
  if (!frankfurter) return base;
  const eurPerMxn = base.rates.EUR;
  const frankEur = frankfurter.base === "EUR" ? 1 : frankfurter.rates.EUR;
  if (!eurPerMxn || !frankEur) return base;
  const rates: Record<string, number> = { ...base.rates };
  for (const [c, perBase] of Object.entries(frankfurter.rates)) {
    if (c === "MXN" || c === "USD" || c === "EUR") continue; // Banxico manda
    const perEur = perBase / frankEur; // C por un euro
    if (Number.isFinite(perEur) && perEur > 0) rates[c] = perEur * eurPerMxn; // C por un peso
  }
  return { base: "MXN", date: base.date, rates };
}
