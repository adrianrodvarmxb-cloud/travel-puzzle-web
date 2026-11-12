/**
 * REQ-066 (D9): en modo 2, Freetour solo permite editar reservas gratis.
 * Es de pago si se cobró algo (price) o si el tour tiene precio aunque se pague a la llegada (fullPrice). Puro.
 */
// REQ-066
export function isFreeBooking(record: { price?: number | null; fullPrice?: number | null }): boolean {
  return !((record.price ?? 0) > 0) && !((record.fullPrice ?? 0) > 0);
}
