import type { IzFTEventDetail } from "@/lib/api/schemas/FTEvent.Schema";
import { pricesFor } from "./paid-price";

/** `price` es lo que se cobra hoy (payableNow); `fullPrice` el total del grupo. */
export type EventCheck =
  | { ok: true; price: number; fullPrice: number; isPaid: boolean }
  | { ok: false; code: "no_availability" | "phone_required" | "children_not_allowed" };

/**
 * Revisa con los datos reales del evento (Freetour) si se puede reservar y
 * calcula el precio del grupo. El precio nunca se toma del navegador.
 */
export function checkEvent(
  ev: IzFTEventDetail,
  { adults, children, hasPhone }: { adults: number; children: number; hasPhone: boolean }
): EventCheck {
  if (!ev.isAvailable || adults < ev.minAdultsPerBooking) return { ok: false, code: "no_availability" };
  if (adults > ev.availableAdultPlaces || children > ev.availableChildrenPlaces) return { ok: false, code: "no_availability" };
  if (ev.isPhoneRequired && !hasPhone) return { ok: false, code: "phone_required" };

  // REQ-010: la tabla va por adultos y se cobra hoy payableNow (antes se usaba adultos + niños y el total).
  const p = pricesFor(ev, adults, children);
  if (!p.ok) return { ok: false, code: p.code === "children_not_allowed" ? "children_not_allowed" : "no_availability" };
  return { ok: true, price: p.payNow, fullPrice: p.fullPrice, isPaid: p.isPaid };
}
