/**
 * Insignia y aviso de la ficha con el evento consultado en vivo (GET /events/{id}, nunca la caché). Puro.
 * El grupo elegido de entrada es el mínimo del evento (minAdultsPerBooking); el formulario de reserva
 * vuelve a consultar el evento al elegir personas.
 */
import { primeraPiezaBadge } from "./badge";
import { eventNotice } from "./notice";
import type { FxRates } from "@/trips/lib/money";

export interface LiveEventDetail {
  fullPricePerGroup: Record<string, number>;
  payableNowPricePerGroup?: Record<string, number>;
  minAdultsPerBooking?: number;
}

// REQ-095 REQ-096 REQ-097
export function liveEventInfo({ detail, isFreeTour, rates, lang }: { detail: LiveEventDetail; isFreeTour: boolean; rates: FxRates | null; lang: string }) {
  const groupSize = Math.max(1, Math.floor(detail.minAdultsPerBooking ?? 1));
  return {
    badge: primeraPiezaBadge({ isFreeTour, fullPricePerGroup: detail.fullPricePerGroup, groupSize }),
    notice: eventNotice({ fullPricePerGroup: detail.fullPricePerGroup, payableNowPricePerGroup: detail.payableNowPricePerGroup, currency: "EUR", rates, lang }).lines,
  };
}
