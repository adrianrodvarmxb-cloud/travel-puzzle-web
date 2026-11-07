/** Regla de cancelación que ve el cliente antes de confirmar (D3). Pura; se calcula en el servidor (INC-001). */

const DAY_MS = 24 * 3600 * 1000;

/** `utcDate` de FREETOUR («2026-11-06 06:00:00», sin zona) o ISO; NaN si no se entiende. */
export function parseUtc(value: string | null | undefined): number {
  if (!value) return NaN;
  const v = value.trim();
  return Date.parse(`${v.replace(" ", "T")}${/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? "" : "Z"}`);
}

const RULE = "Cancelación gratis con reembolso hasta 24 h antes del tour; después, sin reembolso.";

// REQ-934
export function cancelNotice(b: { paid: boolean; eventUtcDate: string | null }, now: Date): { summary: string; confirm: string | null } {
  if (!b.paid) return { summary: "Cancela para liberar tu lugar para otro viajero. No tiene costo.", confirm: null };
  const t = parseUtc(b.eventUtcDate);
  if (!Number.isFinite(t)) return { summary: RULE, confirm: RULE };
  return {
    summary: RULE,
    confirm: t - now.getTime() >= DAY_MS
      ? "Faltan más de 24 h: si cancelas ahora, el reembolso de lo pagado es automático."
      : "Faltan menos de 24 h: si cancelas ahora no hay reembolso.",
  };
}
