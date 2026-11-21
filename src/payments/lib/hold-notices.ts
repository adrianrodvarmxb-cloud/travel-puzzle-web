/** Cuándo avisar y cuándo da por vencida una retención de tarjeta (REQ-3484). Puro. */
export const HOLD_NOTICE_DAYS = 5;
/** Stripe suelta una retención de tarjeta a los ~7 días. */
export const HOLD_EXPIRY_DAYS = 7;

export type HoldStage = { stage: "ok" } | { stage: "notice"; daysLeft: number } | { stage: "expired" };

const DAY = 86_400_000;

// REQ-3484
export function classifyHold(heldAt: Date, now: Date): HoldStage {
  const age = (now.getTime() - heldAt.getTime()) / DAY;
  if (!Number.isFinite(age)) return { stage: "ok" };
  if (age >= HOLD_EXPIRY_DAYS) return { stage: "expired" };
  if (age >= HOLD_NOTICE_DAYS) return { stage: "notice", daysLeft: Math.max(1, Math.ceil(HOLD_EXPIRY_DAYS - age)) };
  return { stage: "ok" };
}
