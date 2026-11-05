/**
 * REQ-038: precio de venta a partir de la tarifa NETA de un operador. Puro.
 * Los porcentajes se reciben por parámetro: no viven en este repo (es público y, junto con el precio
 * publicado, permitirían deducir la tarifa neta confidencial del operador).
 * Reglas: programa nunca por debajo del precio publicado del operador; tour con mínimo en USD;
 * siempre se redondea hacia arriba al dólar entero.
 */
export type MarkupKind = "programa" | "tour" | "privado" | "traslado";

export interface MarkupRates { pct: Record<MarkupKind, number>; minTourUsd: number }
export interface MarkupRule { kind: MarkupKind; published?: number | null }

/** Redondea a centavos antes de subir al entero para evitar 2064.0000000002 → 2065. */
const ceilUsd = (x: number) => Math.ceil(Math.round(x * 100) / 100);

export function sellPrice(net: number, rule: MarkupRule, rates: MarkupRates): number {
  if (!Number.isFinite(net) || net <= 0) throw new Error(`Neto inválido: ${net}`);
  const pct = rates.pct[rule.kind];
  if (!Number.isFinite(pct) || pct < 0) throw new Error(`Margen inválido para ${rule.kind}`);
  let sell = net * (1 + pct);
  if (rule.kind === "tour") sell = Math.max(sell, net + rates.minTourUsd);
  if (rule.kind === "programa" && rule.published && rule.published > sell) sell = rule.published;
  return ceilUsd(sell);
}

export interface NetTier { label: string; net: number }

export function sellTiers(tiers: NetTier[], rule: MarkupRule, rates: MarkupRates): (NetTier & { sell: number })[] {
  return tiers.map((t) => ({ ...t, sell: sellPrice(t.net, rule, rates) }));
}
