/** Interruptor BOOKINGS_ENABLED: solo "true" enciende las reservas reales. */
export function isBookingsEnabled(value: string | undefined): boolean {
  return value === "true";
}
