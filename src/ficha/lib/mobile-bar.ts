/**
 * REQ-10910 · Barra fija de precio y reserva en celular para la ficha única de viajes (decisión 25 del plan; anexo 3
 * punto 10 del PO, 26-11-2026: «hoy no existe; solo es fijo el menú»). Bloquea el "true" de `FICHA_UNICA_TRIP_ENABLED`.
 * Puro: recibe la vista del panel ya armada y devuelve lo que pinta la barra: el precio «desde» del proveedor (con su
 * ruta de precio local, REQ-10874) y el botón que lleva al panel (ancla `#reserva`); sin precio, solo el botón.
 * Sin neto ni margen: el precio es el público que ya trae el panel. La barra no sale sin control de reserva.
 */
import type { FichaLang } from "./model";
import type { PanelView } from "./panel-view";

export interface MobileBarView {
  /** Precio del proveedor, igual para todos (null = sin precio: solo el botón). */
  priceText: string | null;
  /** REQ-10874: ruta para pedir el precio en la moneda del visitante; null = no se pide. */
  localUrl: string | null;
  /** Texto del botón según el control del panel. */
  cta: string;
  /** Ancla del panel en la misma página (el panel va debajo del contenido en celular). */
  href: string;
}

export const MOBILE_BAR_ANCHOR = "reserva";

const CTA: Record<FichaLang, Record<"request-form" | "purchase-box" | "calendar" | "advisor", string>> = {
  es: { "request-form": "Solicitar reserva", "purchase-box": "Comprar", calendar: "Reservar", advisor: "Apartar con un asesor" },
  en: { "request-form": "Request booking", "purchase-box": "Buy", calendar: "Book", advisor: "Book with an advisor" },
  pt: { "request-form": "Solicitar reserva", "purchase-box": "Comprar", calendar: "Reservar", advisor: "Reservar com um consultor" },
  fr: { "request-form": "Demander la réservation", "purchase-box": "Acheter", calendar: "Réserver", advisor: "Réserver avec un conseiller" },
  de: { "request-form": "Buchung anfragen", "purchase-box": "Kaufen", calendar: "Buchen", advisor: "Mit Berater buchen" },
  it: { "request-form": "Richiedi prenotazione", "purchase-box": "Acquista", calendar: "Prenota", advisor: "Prenota con un consulente" },
};

// REQ-10910
export function mobileBarView(panel: PanelView, lang: FichaLang): MobileBarView | null {
  const control = panel.plan.control;
  const c = CTA[lang] ?? CTA.es;
  const cta = c[control as keyof typeof c];
  if (!cta) return null;
  return {
    priceText: panel.price?.text?.trim() || null,
    localUrl: panel.price?.localUrl ?? null,
    cta,
    href: `#${MOBILE_BAR_ANCHOR}`,
  };
}
