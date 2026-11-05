/**
 * REQ-082: Puzzle Rewards (premios, piezas, descuentos) nunca se generan por reservas,
 * asistencia o reseñas de tours de FREETOUR («tráfico incentivado», affiliate-terms §7.2;
 * skill cumplimiento-freetour, regla B4). Puro.
 *
 * Hoy no existe código que otorgue recompensas (ACCOUNTS_ENABLED apagado). Esta guarda
 * queda lista: el futuro cálculo de Rewards debe pasar cada candidato por
 * `filterRewardable` o `assertNoFreetourReward` antes de otorgar algo.
 */
import { isFreetourOffer, type OfferSource } from "./promo-policy";
import { REF_PATTERN } from "@/booking/rejection";

export type RewardTrigger = "booking" | "attendance" | "review";
export type RewardKind = "prize" | "piece" | "discount";

export interface RewardCandidate {
  trigger: RewardTrigger;
  reward: RewardKind;
  /** Origen del producto premiado. Sin origen = FREETOUR (falla cerrada). */
  source?: OfferSource;
  /** Número de reserva; si tiene el formato de FREETOUR, nunca premia. */
  refNumber?: string;
}

export class FreetourRewardError extends Error {
  constructor() {
    super("REQ-082: no se otorgan premios, piezas ni descuentos por reservas, asistencia o reseñas de FREETOUR.");
    this.name = "FreetourRewardError";
  }
}

// REQ-082
export function isRewardEligible(c: RewardCandidate): boolean {
  if (isFreetourOffer(c)) return false;
  if (c.refNumber && REF_PATTERN.test(c.refNumber.trim())) return false;
  return true;
}

// REQ-082
export function filterRewardable<T extends RewardCandidate>(list: readonly T[]): T[] {
  return list.filter(isRewardEligible);
}

// REQ-082
export function assertNoFreetourReward(c: RewardCandidate): void {
  if (!isRewardEligible(c)) throw new FreetourRewardError();
}
