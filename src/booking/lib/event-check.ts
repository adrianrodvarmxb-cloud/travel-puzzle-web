import type { IzFTEventDetail } from "@/lib/api/schemas/FTEvent.Schema";

export type EventCheck = { ok: true; price: number } | { ok: false; code: "no_availability" | "phone_required" };

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

  const prices = Object.values(ev.fullPricePerGroup ?? {});
  const isFree = prices.every((p) => p === 0);
  if (isFree) return { ok: true, price: 0 };

  // REQ-810 (D2, E9): por adultos (formulario, REQ-010 del PR #62) o por adultos + niños; se toma la más cara
  // hasta que api@freetour.com confirme cuál vale. Nunca se reserva gratis un grupo que una lectura marca de pago.
  const readings = [ev.fullPricePerGroup[String(adults)], ev.fullPricePerGroup[String(adults + children)]].filter(
    (p): p is number => typeof p === "number" && Number.isFinite(p)
  );
  return readings.length ? { ok: true, price: Math.max(...readings) } : { ok: false, code: "no_availability" };
}
