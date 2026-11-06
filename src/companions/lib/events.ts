/**
 * REQ-110: eventos de medición del carrusel: tarjeta vista, agregada, reservada y cotización
 * por WhatsApp, por tipo y ciudad. Sin datos personales. Puro.
 */
import { z } from "zod";
import { CART_ITEM_TYPES } from "@/cart/lib/item";

export const CAROUSEL_EVENTS = ["card_viewed", "card_added", "card_booked", "whatsapp_quote"] as const;
export type CarouselEventName = (typeof CAROUSEL_EVENTS)[number];

const zEvent = z.object({
  name: z.enum(CAROUSEL_EVENTS),
  type: z.enum([...CART_ITEM_TYPES, "etias"]),
  cityCode: z.string().min(1).max(80),
  at: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
});
export type CarouselEvent = z.infer<typeof zEvent>;

/** REQ-110: crea un evento válido o lanza. */
export function createCarouselEvent(name: CarouselEventName, card: { type: CarouselEvent["type"]; cityCode: string }, at: string): CarouselEvent {
  return zEvent.parse({ name, type: card.type, cityCode: card.cityCode, at });
}

/** REQ-110: valida lo que manda el navegador; lo malo se descarta (null) y lo extra se quita. */
export function parseCarouselEvent(raw: unknown): CarouselEvent | null {
  const r = zEvent.safeParse(raw);
  return r.success ? r.data : null;
}

export type EventCounts = Record<CarouselEventName, number>;

/** REQ-110: conteo por «tipo|ciudad». */
export function countByTypeAndCity(events: CarouselEvent[]): Record<string, EventCounts> {
  const out: Record<string, EventCounts> = {};
  for (const e of events) {
    const key = `${e.type}|${e.cityCode}`;
    out[key] ??= { card_viewed: 0, card_added: 0, card_booked: 0, whatsapp_quote: 0 };
    out[key][e.name] += 1;
  }
  return out;
}
