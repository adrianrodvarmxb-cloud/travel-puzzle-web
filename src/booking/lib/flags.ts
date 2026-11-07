/** Interruptor BOOKINGS_ENABLED: solo "true" enciende las reservas reales. */
export function isBookingsEnabled(value: string | undefined): boolean {
  return value === "true";
}

/**
 * Tours de pago en recomendaciones (home, mapa, correos). Piloto (gate C): aunque PAID_TOURS_ENABLED
 * esté encendido, solo entran con PAID_TOURS_IN_RECOMMENDATIONS="true".
 */
// REQ-014
export function paidInRecommendations(env: Record<string, string | undefined> | { PAID_TOURS_ENABLED?: string; PAID_TOURS_IN_RECOMMENDATIONS?: string }): boolean {
  const e = env as Record<string, string | undefined>;
  return e.PAID_TOURS_ENABLED === "true" && e.PAID_TOURS_IN_RECOMMENDATIONS === "true";
}
