/**
 * Duplicados de reserva (gate del punto 16, nov 2026):
 * - Traslape: ya hay una reserva activa del mismo correo en el mismo horario.
 * - Token del intento: lo crea el formulario; la pasarela lo usa para no reservar dos veces.
 */
const CLOSED = new Set(["canceled", "rejected"]);

export function isOverlap(
  existing: { eventId: number; email: string; status: string }[],
  req: { eventId: number; email: string }
): boolean {
  const email = req.email.trim().toLowerCase();
  return existing.some((r) => r.eventId === req.eventId && !CLOSED.has(r.status) && r.email.trim().toLowerCase() === email);
}

/** Token del intento si es válido (16 a 64 letras, números, - o _); si no, se ignora. */
export function parseIdempotencyKey(v: unknown): string | undefined {
  return typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v) ? v : undefined;
}
