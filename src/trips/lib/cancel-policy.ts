/**
 * REQ-040: resumen de la política de cancelación de una ficha, para mostrarla antes de reservar
 * (junto al precio y en la aceptación del formulario), como Civitatis y GetYourGuide. Puro.
 */
export interface CancellationPolicy { type: "standard" | "custom" | "none"; tiers: { daysBefore: number; refundPct: number }[] }
export type PolicySummary = { kind: "free"; hours: number } | { kind: "free"; days: number } | { kind: "partial" } | { kind: "none" };

export function policySummary(p: CancellationPolicy): PolicySummary {
  if (p.type === "standard") return { kind: "free", hours: 24 };
  if (p.type === "none") return { kind: "none" };
  const full = p.tiers.filter((t) => t.refundPct >= 100).map((t) => t.daysBefore);
  if (full.length) return { kind: "free", days: Math.min(...full) };
  return p.tiers.some((t) => t.refundPct > 0) ? { kind: "partial" } : { kind: "none" };
}

/** REQ-040: texto corto de la política (usa los textos de la ficha en el idioma del visitante). */
export function policyText(s: PolicySummary, c: { policyFreeHours: (h: number) => string; policyFreeDays: (d: number) => string; policyPartial: string; policyNone: string }): string {
  if (s.kind === "free") return "hours" in s ? c.policyFreeHours(s.hours) : c.policyFreeDays(s.days);
  return s.kind === "partial" ? c.policyPartial : c.policyNone;
}
