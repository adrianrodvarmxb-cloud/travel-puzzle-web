import { normalizePhone } from "./lib/phone";
import { checkEvent } from "./lib/event-check";
import { buildBookingRecord, tourIdFromRef, type BookingRecord } from "./lib/booking-record";
import type { EventInfo } from "./lib/event-info";
import { GatewayError, type Booking, type Customer } from "./gateway-client";
import type { IzFTEventDetail } from "@/lib/api/schemas/FTEvent.Schema";

export type BookingRejectionCode =
  | "bookings_disabled"
  | "paid_not_available"
  | "children_not_allowed"
  | "invalid_phone"
  | "phone_required"
  | "no_availability"
  | "already_booked"
  | "provider_error";

/** Error que se le puede mostrar al cliente (sin detalles internos). */
export class BookingRejected extends Error {
  constructor(readonly code: BookingRejectionCode, message: string) {
    super(message);
    this.name = "BookingRejected";
  }
}

export interface BookingRequest {
  eventId: number;
  adults: number;
  children: number;
  price: number;
  customer: Customer;
  /** Token del intento (lo crea el formulario) para no duplicar la reserva. */
  idempotencyKey?: string;
}

interface Deps {
  gateway: { createBooking(p: BookingRequest): Promise<Booking> };
  /** Datos reales del evento en Freetour (disponibilidad y precios). */
  getEvent(eventId: number): Promise<IzFTEventDetail>;
  /** Interruptor BOOKINGS_ENABLED. */
  enabled: boolean;
  /** REQ-011/014: PAID_TOURS_ENABLED (piloto de tours de pago con checkout de Freetour). */
  paidEnabled?: boolean;
  /** ¿Ya hay una reserva activa de este correo en este horario? */
  hasActiveBooking?(eventId: number, email: string): Promise<boolean>;
}

/** Reserva un free tour en Freetour a través de la pasarela. */
export async function placeBooking(req: BookingRequest, { gateway, getEvent, enabled, paidEnabled = false, hasActiveBooking }: Deps): Promise<{ booking: Booking; price: number; fullPrice: number; isPaid: boolean }> {
  if (!enabled) throw new BookingRejected("bookings_disabled", "Las reservas en línea abren muy pronto.");

  const phone = normalizePhone(req.customer.phone);
  if (phone === null) throw new BookingRejected("invalid_phone", "Revisa el teléfono (incluye la lada, por ejemplo +52 55 1234 5678).");

  // Si la revisión falla no se bloquea al cliente (la pasarela además evita el doble envío).
  const overlap = hasActiveBooking ? await hasActiveBooking(req.eventId, req.customer.email.trim().toLowerCase()).catch(() => false) : false;
  if (overlap) throw new BookingRejected("already_booked", "Ya tienes una reserva para este horario. Revisa tu correo.");

  // El precio y la disponibilidad salen de Freetour, nunca del navegador.
  const event = await getEvent(req.eventId).catch(() => null);
  if (!event) throw new BookingRejected("no_availability", "Este horario ya no está disponible. Elige otro.");
  const check = checkEvent(event, { adults: req.adults, children: req.children, hasPhone: !!phone });
  if (!check.ok) {
    if (check.code === "children_not_allowed") throw new BookingRejected("children_not_allowed", "Este tour con costo no admite niños en la reserva; regístralos como adultos o elige otro horario.");
    throw check.code === "phone_required"
      ? new BookingRejected("phone_required", "Para este tour el teléfono es obligatorio.")
      : new BookingRejected("no_availability", "Este horario ya no está disponible para ese número de personas. Elige otro.");
  }
  // REQ-014: tours de pago solo con el piloto encendido; el cobro lo hace el checkout de Freetour (REQ-011).
  if (check.isPaid && !paidEnabled) throw new BookingRejected("paid_not_available", "El pago en línea estará disponible muy pronto.");

  const customer = { ...req.customer, ...(phone ? { phone } : {}) };
  if (!phone) delete (customer as Partial<Customer>).phone;

  try {
    const booking = await gateway.createBooking({ ...req, price: check.price, customer });
    return { booking, price: check.price, fullPrice: check.fullPrice, isPaid: check.isPaid };
  } catch (error) {
    if (error instanceof GatewayError && error.status === 404) {
      throw new BookingRejected("no_availability", "Este horario ya no está disponible. Elige otro.");
    }
    console.error("[reservas] la pasarela rechazó la reserva:", error instanceof GatewayError ? `${error.status} ${error.errorCode}` : (error as Error).message);
    throw new BookingRejected("provider_error", "No pudimos confirmar tu reserva en este momento. Intenta de nuevo en unos minutos.");
  }
}

/**
 * Guarda la reserva ya confirmada por Freetour. Nunca lanza: si algo falla, el
 * cliente igual recibe su número de reserva y el error queda en el registro.
 */
export async function recordBooking(
  input: { booking: Booking; request: BookingRequest; price: number },
  deps: {
    getEventInfo(tourId: number, eventId: number): Promise<EventInfo | null>;
    save(record: BookingRecord): Promise<void>;
    newToken(): string;
    now: Date;
  }
): Promise<BookingRecord | null> {
  try {
    const tourId = tourIdFromRef(input.booking.refNumber);
    const event = tourId ? await deps.getEventInfo(tourId, input.booking.eventId ?? input.request.eventId).catch(() => null) : null;
    const record = buildBookingRecord({ ...input, event, token: deps.newToken(), now: deps.now });
    await deps.save(record);
    return record;
  } catch (error) {
    console.error(`[reservas] no se guardó la reserva ${input.booking.refNumber}:`, (error as Error).message);
    return null;
  }
}
