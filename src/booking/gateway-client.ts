import { signRequest } from "./lib/signature";

/**
 * Cliente de la pasarela de reservas (servidor de Namecheap con la IP registrada en Freetour).
 * Todas las operaciones de reserva y pago pasan por aquí.
 */
export interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface Booking {
  refNumber: string;
  eventId: number;
  customerId?: string;
  status: string;
  canBeCanceled: number;
  canBeEdited: number;
  createdAt: string | number;
}

export interface BookingRef {
  refNumber: string;
  eventId: number;
  adults: number;
  children: number;
}

export class GatewayError extends Error {
  constructor(message: string, readonly status: number, readonly errorCode: number | null) {
    super(message);
    this.name = "GatewayError";
  }
}

interface Deps {
  url: string;
  secret: string;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  now?: () => number;
}

export function createGatewayClient({ url, secret, fetch, now = Date.now }: Deps) {
  async function call<T>(op: string, payload: unknown): Promise<T> {
    if (!url || !secret) throw new GatewayError("Pasarela no configurada (GATEWAY_URL / GATEWAY_SECRET)", 0, null);
    const body = JSON.stringify({ op, payload });
    const timestamp = String(now());
    const res = await fetch(`${url.replace(/\/+$/, "")}/freetour`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tp-timestamp": timestamp,
        "x-tp-signature": await signRequest(secret, timestamp, body),
      },
      body,
    });
    const json = (await res.json().catch(() => null)) as { data?: any; error?: string } | null;
    if (!res.ok) {
      const message = json?.data?.errorMessage ?? json?.error ?? `HTTP ${res.status}`;
      throw new GatewayError(message, res.status, json?.data?.errorCode ?? null);
    }
    return json?.data as T;
  }

  return {
    createBooking: (p: { eventId: number; adults: number; children: number; price: number; customer: Customer }) => call<Booking>("createBooking", p),
    getBooking: (refNumber: string) => call<Booking>("getBooking", { refNumber }),
    cancelBooking: (p: BookingRef) => call<{ refNumber: string }>("cancelBooking", p),
    editBooking: (p: BookingRef) => call<Booking>("editBooking", p),
    getEventForEdit: (eventId: number, refNumber: string) => call<unknown>("getEventForEdit", { eventId, refNumber }),
    createPayment: (p: { refNumber: string; successUrl: string; cancelUrl: string }) =>
      call<{ paymentUrl: string; checkoutSessionId: string; createdAt: string; expiresAt: string }>("createPayment", p),
    getPaymentStatus: (checkoutSessionId: string) => call<{ refNumber: string; paymentStatus: number }>("getPaymentStatus", { checkoutSessionId }),
  };
}

export type GatewayClient = ReturnType<typeof createGatewayClient>;
