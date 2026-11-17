/**
 * REQ-10782 · Plan §2: panel de reserva en dos ejes, cómo se reserva (`booking.mode`) y quién cobra
 * (`booking.chargedBy`), decidido SOLO desde el modelo de la ficha y las banderas; nunca desde el proveedor
 * (INC-020: el panel aplicaba reglas de FREETOUR a Tangol). Un caso por combinación. Puro, sin idioma.
 */
import type { BookingMode, ChargedBy, FichaModel } from "./model";

export interface PanelFlags {
  /** BOOKINGS_ENABLED: calendario con eventos en vivo (solo tiene sentido con mode = calendar). */
  bookings: boolean;
  /** PAID_TOURS_ENABLED: cobro del tour de pago por el checkout del proveedor. */
  paidTours: boolean;
  /** Compra directa (p. ej. Big Bus por OCTO) encendida. */
  directPurchase: boolean;
}

/** Control de reserva que se monta (LSP: los cuatro cumplen la misma interfaz). */
export type PanelControl = "calendar" | "purchase-box" | "request-form" | "advisor";

export interface PanelPlan {
  control: PanelControl;
  chargedBy: ChargedBy;
  /** Qué moneda se cobra, si se cobra: la del precio de la ficha. null = no hay cobro en línea. */
  chargeCurrency: string | null;
  /** Texto de pago que corresponde (clave; el idioma lo pone payment-copy): */
  paymentNote: "tip-at-end" | "provider-checkout" | "pay-on-site" | "advisor-confirms" | "pay-now" | "none";
  /** true cuando el control pedido no está encendido y se cae al asesor (nunca a un control de otro proveedor). */
  fellBackToAdvisor: boolean;
  /** Horas mínimas de anticipación para reservar, si el proveedor las fija. */
  leadHours: number | null;
}

// REQ-10782
export function panelPlan(f: Pick<FichaModel, "booking" | "price" | "provider">, flags: PanelFlags): PanelPlan {
  const { mode, chargedBy, leadHours } = f.booking;
  const currency = f.price?.currency ?? null;
  const advisor = (fell: boolean): PanelPlan => ({ control: "advisor", chargedBy: "none", chargeCurrency: null, paymentNote: "advisor-confirms", fellBackToAdvisor: fell, leadHours });

  switch (mode as BookingMode) {
    case "calendar": {
      if (!flags.bookings) return advisor(true);
      if (chargedBy === "none") return { control: "calendar", chargedBy: "none", chargeCurrency: null, paymentNote: "tip-at-end", fellBackToAdvisor: false, leadHours };
      if (!flags.paidTours) return advisor(true);
      return { control: "calendar", chargedBy, chargeCurrency: currency, paymentNote: chargedBy === "provider" ? "provider-checkout" : "pay-now", fellBackToAdvisor: false, leadHours };
    }
    case "purchase":
      if (!flags.directPurchase) return advisor(true);
      return { control: "purchase-box", chargedBy: chargedBy === "none" ? "travelpuzzle" : chargedBy, chargeCurrency: currency, paymentNote: "pay-now", fellBackToAdvisor: false, leadHours };
    case "request":
      return { control: "request-form", chargedBy: "none", chargeCurrency: null, paymentNote: "advisor-confirms", fellBackToAdvisor: false, leadHours };
    case "advisor":
      return advisor(false);
  }
}
