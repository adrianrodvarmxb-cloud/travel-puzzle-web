/**
 * REQ-10851, REQ-10854, REQ-10855, REQ-10856 · Ficha única, ola 7: vista del panel de reserva (plan §3, «Panel de reserva
 * en computadora»: precio en la moneda del visitante con la moneda del cargo a la vista, control de reserva, texto de
 * pago, «Agregar a mi viaje» y acceso a Mila o al asesor). Arma lo que pinta cada pieza del panel a partir del modelo,
 * del plan de `panel-plan.ts` (quién cobra y con qué control) y de un contexto que entrega el servidor. Puro: sin I/O,
 * sin banderas (llegan resueltas en `PanelContext`), sin reloj, sin `Intl` (INC-001).
 *
 * - Precio: `local-price.ts` (decisión 32); cancelación resumida junto al precio: `cancellationSummary` (decisión 34).
 * - Texto de pago: uno por clave del plan; ningún texto depende del proveedor (INC-020). Reusa los textos ya firmados:
 *   propina (`tours.tipNote`), pago al reservar y en el punto de encuentro (REQ-097) y el plazo único (REQ-10653).
 * - «Agregar a mi viaje» en toda ficha (decisión 23); sin cobro en línea la pieza entra «por cotizar», sin monto.
 * - Ayuda: «Mila» en todas las fichas y el asesor por WhatsApp en FREETOUR (decisiones 42 y 43).
 * Si falta el dato, la pieza es null y no se pinta; nunca «N/D».
 */
import { translations } from "@/lib/translations";
import { bookingCopy } from "@/tours/lib/booking-cta";
import { paidPolicy } from "@/tours/lib/paid-policy";
import { FREETOUR_PROVIDER } from "./blocks";
import { cancellationSummary } from "./cancellation";
import { milaCta } from "./closing-view";
import { localPrice, type FxTable } from "./local-price";
import type { FichaLang, FichaModel } from "./model";
import type { PanelPlan } from "./panel-plan";
import { advisorConfirmation } from "./payment-copy";
import type { FichaPrefill } from "./prefill";
import { referenciaFicha, whatsappLink } from "./whatsapp-context";

export interface PanelContext {
  /** País del visitante (lo lee el borde, fuera del HTML en caché). */
  visitorCountry: string | null;
  fx: FxTable | null;
  /** Número de WhatsApp de Travel Puzzle; null = sin acceso a Mila ni asesor. */
  whatsapp: string | null;
  prefill: FichaPrefill;
  /** Mila encendida en la ficha (bandera resuelta por el servidor). */
  milaEnabled: boolean;
  /** Carrito encendido (bandera resuelta por el servidor). */
  cartEnabled: boolean;
}

export interface PriceView { text: string }
export interface PaymentNoteView { key: PanelPlan["paymentNote"]; text: string }
export interface AddToTripView { label: string; quote: boolean; note: string | null; ref: string }
export interface AdvisorLinkView { kind: "mila" | "asesor"; title: string; cta: string; href: string }

export interface PanelView {
  plan: PanelPlan;
  price: PriceView | null;
  cancellation: string | null;
  payment: PaymentNoteView | null;
  addToTrip: AddToTripView | null;
  advisor: AdvisorLinkView | null;
}

const ADD: Record<"es" | "en", { label: string; quote: string }> = {
  es: { label: "Agregar a mi viaje", quote: "Por cotizar" },
  en: { label: "Add to my trip", quote: "To be quoted" },
};
const add = (lang: FichaLang) => (lang === "es" ? ADD.es : ADD.en);

/** Texto de pago por clave; null si la clave no lleva texto o falta el precio que el texto necesita. */
// REQ-10854
export function paymentNoteText(plan: PanelPlan, f: Pick<FichaModel, "price" | "lang">): string | null {
  const amount = f.price?.amount ?? 0;
  const currency = plan.chargeCurrency ?? f.price?.currency ?? null;
  switch (plan.paymentNote) {
    case "tip-at-end": {
      const t = translations[f.lang] ?? translations.es;
      return t["tours.tipNote"] ?? null;
    }
    case "provider-checkout":
    case "pay-now":
      return amount > 0 && currency ? paidPolicy({ fullPrice: amount, payNow: amount, isPartiallyPaid: false, currency }, f.lang).payment : null;
    case "pay-on-site":
      return amount > 0 && currency ? paidPolicy({ fullPrice: amount, payNow: 0, isPartiallyPaid: false, currency }, f.lang).payment : null;
    case "advisor-confirms":
      return advisorConfirmation(f.lang);
    case "none":
      return null;
  }
}

/** «Agregar a mi viaje»: por cotizar cuando hay monto pero no se cobra en línea, o no hay precio. */
// REQ-10855
export function addToTripView(f: FichaModel, plan: PanelPlan, cartEnabled: boolean): AddToTripView | null {
  if (!cartEnabled) return null;
  const quote = !f.price || (f.price.amount > 0 && plan.chargeCurrency === null);
  const c = add(f.lang);
  return { label: c.label, quote, note: quote ? c.quote : null, ref: referenciaFicha(f) };
}

/** Acceso a Mila (o al asesor en FREETOUR o con Mila apagada) con el contexto de la ficha (decisión 41). */
// REQ-10856
export function advisorLinkView(f: FichaModel, c: Pick<PanelContext, "whatsapp" | "prefill" | "milaEnabled">): AdvisorLinkView | null {
  const href = whatsappLink(c.whatsapp, f, c.prefill);
  if (!href) return null;
  const copy = bookingCopy(f.lang);
  const mila = c.milaEnabled && f.provider !== FREETOUR_PROVIDER;
  return { kind: mila ? "mila" : "asesor", title: copy.advisorTitle, cta: mila ? milaCta(f.lang) : copy.advisorCta, href };
}

/** Vista completa del panel; cada pieza va a su componente (ISP). */
// REQ-10851
export function panelView(f: FichaModel, plan: PanelPlan, c: PanelContext): PanelView {
  return {
    plan,
    price: f.price ? { text: localPrice(f.price, { visitorCountry: c.visitorCountry, fx: c.fx, lang: f.lang }).text } : null,
    cancellation: cancellationSummary(f.cancellation?.hours, f.lang),
    payment: ((t) => (t ? { key: plan.paymentNote, text: t } : null))(paymentNoteText(plan, f)),
    addToTrip: addToTripView(f, plan, c.cartEnabled),
    advisor: advisorLinkView(f, c),
  };
}
