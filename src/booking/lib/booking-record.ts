import type { Booking } from "../gateway-client";
import type { BookingRequest } from "../service";
import type { EventInfo } from "./event-info";

/** El número de reserva de Freetour empieza con el id del tour: "6782-20261030162746-244". */
export function tourIdFromRef(refNumber: string): number | null {
  const m = /^(\d+)-/.exec(refNumber);
  return m ? Number(m[1]) : null;
}

export interface BookingRecord {
  refNumber: string;
  tourExternalId: number | null;
  eventId: number;
  adults: number;
  children: number;
  price: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  eventDate: string | null;
  eventUtcDate: string | null;
  language: string | null;
  status: string;
  manageToken: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Registro que guardamos de cada reserva confirmada. */
export function buildBookingRecord(input: {
  booking: Booking;
  request: BookingRequest;
  price: number;
  event: EventInfo | null;
  token: string;
  now: Date;
}): BookingRecord {
  const { booking, request, price, event, token, now } = input;
  return {
    refNumber: booking.refNumber,
    tourExternalId: tourIdFromRef(booking.refNumber),
    eventId: booking.eventId ?? request.eventId,
    adults: request.adults,
    children: request.children,
    price,
    email: request.customer.email.trim().toLowerCase(),
    firstName: request.customer.firstName.trim(),
    lastName: request.customer.lastName.trim(),
    phone: request.customer.phone ?? null,
    eventDate: event?.date ?? null,
    eventUtcDate: event?.utcDate ?? null,
    language: event?.language ?? null,
    status: booking.status,
    manageToken: token,
    createdAt: now,
    updatedAt: now,
  };
}
