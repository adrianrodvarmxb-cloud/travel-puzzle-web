import type { OctoBooking } from "./schemas";

/**
 * Flujo de compra directa (Ventrata, certificación de revendedores):
 * 1) apartar al empezar el pago (no al agregar al carrito), 2) confirmar solo después del cobro,
 * 3) cancelar por API los apartados que no se confirmen, 4) entregar solo lo que diga `deliveryMethods`.
 */

/** Minutos que se aparta el lugar mientras el cliente paga. Stripe pide al menos 30 min de sesión; el apartado dura más (REQ-3418). */
export const HOLD_MINUTES = 45;

export type HoldState = "confirmable" | "expired" | "not-on-hold";

/** ¿Se puede confirmar este apartado ahora? */
// REQ-3328
export function holdState(b: OctoBooking, nowMs: number): HoldState {
  if (b.status !== "ON_HOLD") return "not-on-hold";
  if (b.utcExpiresAt && Date.parse(b.utcExpiresAt) <= nowMs) return "expired";
  return "confirmable";
}

/** Un apartado que no se pagó se libera por API (no se deja vencer en silencio). */
// REQ-3328
export function mustReleaseHold(b: OctoBooking, paid: boolean): boolean {
  return b.status === "ON_HOLD" && !paid;
}

export interface Deliverable {
  kind: "voucher" | "ticket";
  qr: string | null;
  pdfUrl: string | null;
}

export interface Delivery {
  /** Se imprime debajo de cada código (regla de Ventrata). */
  supplierReference: string | null;
  items: Deliverable[];
}

function pick(options: { deliveryFormat: string; deliveryValue: string }[], kind: Deliverable["kind"]): Deliverable | null {
  const qr = options.find((o) => o.deliveryFormat === "QRCODE")?.deliveryValue ?? null;
  const pdfUrl = options.find((o) => o.deliveryFormat === "PDF_URL" && o.deliveryValue.startsWith("https://"))?.deliveryValue ?? null;
  return qr || pdfUrl ? { kind, qr, pdfUrl } : null;
}

/**
 * Lo que recibe el cliente tras confirmar: VOUCHER = un código por reserva; TICKET = uno por persona.
 * Solo se entrega el método que trae la reserva; si está confirmada sin códigos, la lista va vacía (se revisa a mano).
 */
// REQ-3328
export function deliverables(b: OctoBooking): Delivery {
  const items: Deliverable[] = [];
  if (b.status === "CONFIRMED") {
    if (b.deliveryMethods.includes("VOUCHER") && b.voucher) {
      const v = pick(b.voucher.deliveryOptions, "voucher");
      if (v) items.push(v);
    }
    if (b.deliveryMethods.includes("TICKET")) {
      for (const u of b.unitItems) {
        const t = u.ticket ? pick(u.ticket.deliveryOptions, "ticket") : null;
        if (t) items.push(t);
      }
    }
  }
  return { supplierReference: b.supplierReference, items };
}
