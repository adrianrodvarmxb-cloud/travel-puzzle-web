/**
 * Insignia de la colección La Primera Pieza. Pura. Se calcula con el evento elegido; nunca va sobre la foto.
 */
export const PRIMERA_PIEZA_BADGE = "🧩 Primera Pieza · Tú decides cuánto vale";

export interface BadgeInput {
  /** Free tour según el sync de hoy. */
  isFreeTour: boolean;
  /** fullPricePerGroup del evento (GET /events/{id}): tamaño de grupo → precio en EUR. */
  fullPricePerGroup: Record<string, number>;
  groupSize: number;
}

// REQ-095: solo free tour con fullPricePerGroup = 0 para el grupo elegido.
export function primeraPiezaBadge({ isFreeTour, fullPricePerGroup, groupSize }: BadgeInput): string | null {
  if (!isFreeTour) return null;
  const prices = Object.values(fullPricePerGroup ?? {});
  const price = fullPricePerGroup?.[String(groupSize)] ?? (prices.every((p) => p === 0) ? 0 : undefined);
  return price === 0 ? PRIMERA_PIEZA_BADGE : null;
}
