/** Lo que sale al navegador de la compra directa de Big Bus: sin net ni datos internos. Puro. */
import type { CatalogPlan, CityPlan } from "./catalog";
import type { OctoCalendarDay } from "./schemas";
import { guestPrice } from "./pricing";
import type { StartResult } from "../purchase";

export interface PublicDay {
  date: string;
  available: boolean;
  from: { amount: number; currency: string } | null;
}

/** Ciudad del plan para la ficha (el plan ya no trae net; se copia solo lo que usa la caja de compra). */
// REQ-3423
export function publicCity(plan: CatalogPlan | null, ref: string): CityPlan | null {
  return plan?.cities.find((c) => c.ref === ref) ?? null;
}

/** Calendario para la ficha: fecha, si se vende y precio «desde» al retail. Nunca el net. */
// REQ-3423
export function publicCalendar(days: OctoCalendarDay[]): PublicDay[] {
  return days.map((d) => ({
    date: d.localDate,
    available: d.available && d.status !== "SOLD_OUT" && d.status !== "CLOSED",
    from: d.pricingFrom ? guestPrice(d.pricingFrom) : null,
  }));
}

/** Mensaje para el cliente por cada motivo de rechazo. */
// REQ-3423
export function purchaseErrorMessage(code: Extract<StartResult, { ok: false }>["code"]): { status: number; message: string } {
  switch (code) {
    case "disabled":
      return { status: 404, message: "La compra en línea no está disponible." };
    case "not_found":
      return { status: 400, message: "Esta opción ya no está disponible. Recarga la página." };
    case "bad_units":
      return { status: 400, message: "Revisa el número de personas (de 1 a 20)." };
    case "past_date":
      return { status: 400, message: "Elige una fecha a partir de hoy." };
    case "sold_out":
      return { status: 409, message: "Ya no hay lugares para esa fecha. Elige otra." };
    case "unsupported_currency":
    case "no_price":
    case "no_fx":
    case "invalid_amount":
      return { status: 409, message: "No pudimos calcular el precio en pesos. Escríbenos y te ayudamos a reservar." };
    case "reserve_failed":
    case "stripe_error":
      return { status: 502, message: "No pudimos abrir el pago. Intenta de nuevo en unos minutos." };
  }
}

/** Ref de ciudad de Big Bus a partir del id del viaje cargado ("bbt-nyc" → "NYC"). Null si no es de Big Bus. */
// REQ-3423
export function bigBusRefForTrip(tripId: string, refs: string[]): string | null {
  const m = /^bbt-([a-z]{3})$/.exec(tripId);
  const ref = m ? m[1].toUpperCase() : null;
  return ref && refs.includes(ref) ? ref : null;
}

export interface BuyState {
  ref: string;
  productId: string;
  optionId: string;
  date: string;
  qty: Record<string, number>;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
  language: "es" | "en";
}

/** Cuerpo del POST /api/bigbus/compra desde el estado de la caja de compra (unidades en 0 no se mandan). */
// REQ-3423
export function buildPurchaseBody(s: BuyState) {
  return {
    ref: s.ref,
    productId: s.productId,
    optionId: s.optionId,
    date: s.date,
    units: Object.entries(s.qty)
      .filter(([, n]) => n > 0)
      .map(([id, quantity]) => ({ id, quantity })),
    firstName: s.firstName.trim(),
    lastName: s.lastName.trim(),
    email: s.email.trim(),
    phone: s.phone.trim(),
    language: s.language,
    consent: s.consent,
  };
}

/** Precio sin Intl (render determinista, INC-001): «USD 49» o «USD 49.50». */
export function plainPrice(p: { amount: number; currency: string } | null): string {
  if (!p) return "";
  return `${p.currency} ${Number.isInteger(p.amount) ? p.amount : p.amount.toFixed(2)}`;
}
