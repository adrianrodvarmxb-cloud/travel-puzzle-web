/**
 * REQ-083: el contacto de la reserva debe declararse adulto (los servicios de FREETOUR
 * no son para menores de 16; skill cumplimiento-freetour, G3). Puro.
 * Tras ADULT_CONTACT_CHECK_ENABLED (apagada): con la bandera apagada no cambia nada.
 */
export type AdultContactCheck = { ok: true } | { ok: false; code: "adult_required" };

// REQ-083
export function isAdultContactCheckEnabled(value: string | undefined): boolean {
  return value === "true";
}

/** Solo `true` exacto cuenta como declaración (la casilla marcada). */
// REQ-083
export function checkAdultContact(declared: unknown, required: boolean): AdultContactCheck {
  if (!required) return { ok: true };
  return declared === true ? { ok: true } : { ok: false, code: "adult_required" };
}
