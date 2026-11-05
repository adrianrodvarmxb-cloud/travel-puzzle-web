/**
 * Qué hacer si Freetour no acepta la cancelación (modo 2: la cancelación es obligatoria para nosotros).
 * Permiso denegado o caída → la solicitud queda para el equipo; 37 = ya es tarde; 38/39 = ya no está activa. Puro.
 */
export type CancelFailureAction = "manual_request" | "too_late" | "already";

// REQ-017
export function cancelFailureAction(e: { status?: number; errorCode?: number | null }): CancelFailureAction {
  if (e.errorCode === 37) return "too_late";
  if (e.errorCode === 38 || e.errorCode === 39) return "already";
  return "manual_request";
}
