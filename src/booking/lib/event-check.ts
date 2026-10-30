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

  const price = ev.fullPricePerGroup[String(adults + children)];
  return price === undefined ? { ok: false, code: "no_availability" } : { ok: true, price };
}
