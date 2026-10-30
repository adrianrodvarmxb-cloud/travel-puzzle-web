import { normalizePhone } from "./lib/phone";
import { checkEvent } from "./lib/event-check";
import { GatewayError, type Booking, type Customer } from "./gateway-client";
import type { IzFTEventDetail } from "@/lib/api/schemas/FTEvent.Schema";

export type BookingRejectionCode =
  | "bookings_disabled"
  | "paid_not_available"
  | "invalid_phone"
  | "phone_required"
  | "no_availability"
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
}

interface Deps {
  gateway: { createBooking(p: BookingRequest): Promise<Booking> };
  /** Datos reales del evento en Freetour (disponibilidad y precios). */
  getEvent(eventId: number): Promise<IzFTEventDetail>;
  /** Interruptor BOOKINGS_ENABLED. */
  enabled: boolean;
}

/** Reserva un free tour en Freetour a través de la pasarela. */
export async function placeBooking(req: BookingRequest, { gateway, getEvent, enabled }: Deps): Promise<Booking> {
  if (!enabled) throw new BookingRejected("bookings_disabled", "Las reservas en línea abren muy pronto.");

  const phone = normalizePhone(req.customer.phone);
  if (phone === null) throw new BookingRejected("invalid_phone", "Revisa el teléfono (incluye la lada, por ejemplo +52 55 1234 5678).");

  // El precio y la disponibilidad salen de Freetour, nunca del navegador.
  const event = await getEvent(req.eventId).catch(() => null);
  if (!event) throw new BookingRejected("no_availability", "Este horario ya no está disponible. Elige otro.");
  const check = checkEvent(event, { adults: req.adults, children: req.children, hasPhone: !!phone });
  if (!check.ok) {
    throw check.code === "phone_required"
      ? new BookingRejected("phone_required", "Para este tour el teléfono es obligatorio.")
      : new BookingRejected("no_availability", "Este horario ya no está disponible para ese número de personas. Elige otro.");
  }
  if (check.price > 0) throw new BookingRejected("paid_not_available", "El pago en línea estará disponible muy pronto.");

  const customer = { ...req.customer, ...(phone ? { phone } : {}) };
  if (!phone) delete (customer as Partial<Customer>).phone;

  try {
    return await gateway.createBooking({ ...req, price: check.price, customer });
  } catch (error) {
    if (error instanceof GatewayError && error.status === 404) {
      throw new BookingRejected("no_availability", "Este horario ya no está disponible. Elige otro.");
    }
    console.error("[reservas] la pasarela rechazó la reserva:", error instanceof GatewayError ? `${error.status} ${error.errorCode}` : (error as Error).message);
    throw new BookingRejected("provider_error", "No pudimos confirmar tu reserva en este momento. Intenta de nuevo en unos minutos.");
  }
}
