/**
 * REQ-10573 (INC-020): el calendario, el «Reservar» y la política de pago en euros con reembolso automático son del
 * proveedor de free tours (`providerId` = "freetour"). A cualquier otro proveedor (Tangol hoy) la ficha le daba lo
 * mismo y pintaba «No hay disponibilidad» y «El cargo se hace en euros». Mientras ese proveedor no tenga reserva en
 * línea propia, se aparta con un asesor y no se le promete nada del otro proveedor. Pura.
 */
import { bookingMode, type BookingMode } from "./booking-cta";

export interface SidebarPlan { mode: BookingMode; freetourPaidPolicy: boolean }
const CALENDAR_PROVIDERS = new Set(["freetour"]);

// REQ-10573
export function sidebarPlan(p: { providerId: string | null | undefined; bookingsEnabled: boolean; paidEnabled: boolean; price: number }): SidebarPlan {
  const conCalendario = !p.providerId || CALENDAR_PROVIDERS.has(p.providerId);
  if (!conCalendario) return { mode: "advisor", freetourPaidPolicy: false };
  return { mode: bookingMode(p.bookingsEnabled), freetourPaidPolicy: p.paidEnabled };
}
