/**
 * REQ-084: consentimiento de marketing separado (LFPDPPP): casilla aparte, sin marcar,
 * que no condiciona el servicio. Tras MARKETING_CONSENT_ENABLED (apagada). Puro.
 *
 * Pendiente de revisión del PO y de un abogado: el texto no se publica sin su OK.
 * Encender la bandera requiere además guardar el consentimiento (columna nueva = migración, candado).
 */
export const MARKETING_CONSENT_DEFAULT = false;

export const MARKETING_CONSENT_COPY = {
  reviewNote: "Borrador: pendiente de revisión del PO y de un abogado. No publicar sin OK.",
  es: {
    label: "Quiero recibir promociones, novedades y recomendaciones de viaje de Travel Puzzle por correo electrónico.",
    hint: "Es opcional y no afecta tu registro ni tus reservas. Puedes darte de baja cuando quieras escribiendo a info@travelpuzzle.com.mx.",
  },
  en: {
    label: "I want to receive promotions, news and travel recommendations from Travel Puzzle by email.",
    hint: "It's optional and doesn't affect your account or bookings. You can unsubscribe anytime by writing to info@travelpuzzle.com.mx.",
  },
} as const;

// REQ-084
export function isMarketingConsentEnabled(value: string | undefined): boolean {
  return value === "true";
}

/** Solo hay consentimiento si la bandera está encendida y la casilla llegó marcada (`true` exacto). */
// REQ-084
export function marketingConsentFrom(raw: unknown, enabled: boolean): boolean {
  return enabled && raw === true;
}
