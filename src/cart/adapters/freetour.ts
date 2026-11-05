/**
 * REQ-104: primer adaptador api del carrito. Usa el cliente existente (src/freetour/api.ts) inyectado.
 * Precio y lugares siempre en vivo con GET /events/{id} antes de reservar, nunca de la caché (regla E2).
 * Al cliente nunca se le nombra al proveedor mayorista: cobra «Travel Puzzle» (REQ-098).
 * REQ-107: el cobro (POST /payment → paymentUrl de Stripe) va tras paymentsEnabled (candado).
 */
import { z } from "zod";
import type { FreetourApi } from "@/freetour/api";
import { zFTEventDetail } from "@/lib/api/schemas/FTEvent.Schema";
import { checkEvent } from "@/booking/lib/event-check";
import type { CartItem } from "../lib/item";
import type { Availability, ChargeResult, ChargeUrls, Offer, ProviderAdapter, ReserveResult, SearchQuery } from "../lib/adapter";

/** Los precios de FREETOUR vienen en euros. */
const CURRENCY = "EUR";

export interface FreetourAdapterDeps {
  api: Pick<FreetourApi, "get" | "post">;
  /** CART_PAYMENTS_ENABLED: solo "true" con OK del PO. */
  paymentsEnabled: boolean;
  /** Reserva real (pasarela). Sin ella el adaptador no reserva. */
  book?: (req: { eventId: number; adults: number; children: number; price: number }) => Promise<{ refNumber: string }>;
  cancelBooking?: (refNumber: string) => Promise<boolean>;
  /** Búsqueda de horarios en el catálogo local (sin precio: el precio sale en vivo). */
  findEvents?: (q: SearchQuery) => Promise<Offer[]>;
}

const zPayment = z.object({ paymentUrl: z.string().url(), expiresAt: z.string() });

export function createFreetourAdapter(deps: FreetourAdapterDeps): ProviderAdapter {
  async function liveEvent(eventId: string) {
    const body = await deps.api.get(`/events/${encodeURIComponent(eventId)}`);
    return zFTEventDetail.parse(body?.data);
  }

  return {
    id: "freetour",
    mode: "api",
    types: ["free_tour", "tour"],
    chargedBy: "Travel Puzzle",

    async search(q) {
      return deps.findEvents ? deps.findEvents(q) : [];
    },

    async availability(externalId, q): Promise<Availability> {
      const ev = await liveEvent(externalId);
      const check = checkEvent(ev, { ...q.people, hasPhone: true });
      if (!check.ok) return { available: false };
      return { available: true, price: { amount: check.price, currency: CURRENCY }, places: ev.availableAdultPlaces };
    },

    async reserve(item: CartItem): Promise<ReserveResult> {
      const ev = await liveEvent(item.externalId);
      const check = checkEvent(ev, { ...item.people, hasPhone: true });
      if (!check.ok) throw new Error("Este horario ya no está disponible.");
      if (!deps.book) throw new Error("Reservas del carrito no conectadas.");
      const { refNumber } = await deps.book({ eventId: Number(item.externalId), ...item.people, price: check.price });
      return { kind: "reserved", externalRef: refNumber, price: { amount: check.price, currency: CURRENCY } };
    },

    async cancel(item) {
      if (!deps.cancelBooking || !item.externalRef) return { ok: false };
      return { ok: await deps.cancelBooking(item.externalRef) };
    },

    async charge(item: CartItem, urls: ChargeUrls): Promise<ChargeResult> {
      if (item.price.amount === 0) return { kind: "none" };
      if (!deps.paymentsEnabled) return { kind: "disabled" };
      if (!item.externalRef) throw new Error("Primero se reserva; luego se cobra.");
      const body = await deps.api.post("/payment", { refNumber: item.externalRef, successUrl: urls.success, cancelUrl: urls.cancel });
      const p = zPayment.parse(body?.data);
      return { kind: "payment_url", url: p.paymentUrl, expiresAt: p.expiresAt };
    },
  };
}
