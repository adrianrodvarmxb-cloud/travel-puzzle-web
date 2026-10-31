/**
 * Mezcla de recomendaciones: 60 % tours de pago y 40 % free tours (regla de negocio).
 * Con 3 lugares: 2 de pago + 1 gratis. Si falta de un tipo, se completa con el otro.
 * Los de pago van primero. Mientras los tours de pago no se puedan comprar en el sitio,
 * `includePaid` va en false y todo es free tour (no se recomienda lo que no se puede reservar).
 */
export const PAID_SHARE = 0.6;

export function mixRecommendations<T>(paid: T[], free: T[], n = 3, includePaid = true): T[] {
  if (!includePaid) return free.slice(0, n);
  const wantPaid = Math.round(n * PAID_SHARE);
  const p = paid.slice(0, wantPaid);
  const f = free.slice(0, n - p.length);
  const rest = paid.slice(p.length, p.length + (n - p.length - f.length));
  return [...p, ...rest, ...f];
}
