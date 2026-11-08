/**
 * Lo que el cliente ve antes de reservar un tour con costo. Pura. Se muestra solo con PAID_TOURS_ENABLED.
 * Gate REQ-097 (PO, 5 nov 2026, términos de FREETOUR §1.2 y §1.4.3): cancelación gratis con reembolso hasta
 * 24 h antes; después o si no se presenta, no hay reembolso. Con depósito o pago a la llegada aplica lo mismo
 * sobre lo pagado.
 */
export interface PaidPrice {
  fullPrice: number;
  payNow: number;
  isPartiallyPaid: boolean;
  currency: string;
}

export interface PaidPolicy {
  payment: string | null;
  cancel: string;
  noShow: string;
}

const money = (currency: string, n: number) => `${currency} ${Number.isInteger(n) ? n : n.toFixed(2)}`;

type Kind = "unknown" | "full" | "deposit" | "arrival";

function kindOf(price: PaidPrice | null): Kind {
  if (!price) return "unknown";
  if (price.payNow <= 0 && price.fullPrice > 0) return "arrival";
  if (price.isPartiallyPaid && price.payNow < price.fullPrice) return "deposit";
  return "full";
}

const T = {
  es: {
    full: (p: PaidPrice) => `Pagas ${money(p.currency, p.fullPrice)} al reservar.`,
    deposit: (p: PaidPrice) => `Hoy pagas un depósito de ${money(p.currency, p.payNow)}; el resto, ${money(p.currency, p.fullPrice - p.payNow)}, se paga en el punto de encuentro.`,
    arrival: (p: PaidPrice) => `Pagas ${money(p.currency, p.fullPrice)} en el punto de encuentro; al reservar no pagas nada.`,
    refundOf: { unknown: "de lo pagado", full: "de lo pagado", deposit: "del depósito" } as Record<Kind, string>,
    cancel: (refund: string | null) => `Cancelación gratis${refund ? ` con reembolso ${refund}` : ""} hasta 24 h antes del tour, desde el enlace de tu correo de confirmación.`,
    noShow: (arrival: boolean) => `Si cancelas con menos de 24 h o no te presentas, no hay reembolso${arrival ? " de lo pagado" : ""}.`,
  },
  en: {
    full: (p: PaidPrice) => `You pay ${money(p.currency, p.fullPrice)} when booking.`,
    deposit: (p: PaidPrice) => `Today you pay a ${money(p.currency, p.payNow)} deposit; the rest, ${money(p.currency, p.fullPrice - p.payNow)}, is paid at the meeting point.`,
    arrival: (p: PaidPrice) => `You pay ${money(p.currency, p.fullPrice)} at the meeting point; nothing is charged when booking.`,
    refundOf: { unknown: "of what you paid", full: "of what you paid", deposit: "of the deposit" } as Record<Kind, string>,
    cancel: (refund: string | null) => `Free cancellation${refund ? ` with a refund ${refund}` : ""} up to 24 h before the tour, from the link in your confirmation email.`,
    noShow: (arrival: boolean) => `If you cancel less than 24 h before or don't show up, there is no refund${arrival ? " of what you paid" : ""}.`,
  },
};

// REQ-097
export function paidPolicy(price: PaidPrice | null, lang: string): PaidPolicy {
  const t = lang === "es" ? T.es : T.en;
  const kind = kindOf(price);
  const payment = !price ? null : kind === "arrival" ? t.arrival(price) : kind === "deposit" ? t.deposit(price) : t.full(price);
  // Con pago a la llegada no hay nada que reembolsar antes de las 24 h; después, lo pagado no se devuelve.
  return {
    payment,
    cancel: t.cancel(kind === "arrival" ? null : t.refundOf[kind]),
    noShow: t.noShow(kind === "arrival"),
  };
}

/**
 * Gate B (3 nov 2026): el texto de reembolso es el que Freetour confirme por escrito (Elias).
 * Mientras sea null, no se afirma nada sobre reembolsos y no se puede reservar un tour de pago.
 * Al recibir la confirmación se pega aquí (es/en) con la fecha y el correo de origen.
 */
export type RefundText = { es: string; en: string } & Partial<Record<"pt" | "de" | "fr" | "it", string>>;

/** Confirmado por escrito por Elias (Freetour): reembolso automático hasta 24 h antes del tour y cuando el operador rechaza la reserva. */
export const CONFIRMED_REFUND_TEXT: RefundText | null = {
  es: "Si cancelas hasta 24 horas antes del tour, el reembolso de tu pago es automático. También recibes el reembolso automático si el operador rechaza tu reserva.",
  en: "If you cancel up to 24 hours before the tour, your payment is refunded automatically. You are also refunded automatically if the operator rejects your booking.",
  pt: "Se você cancelar até 24 horas antes do tour, o reembolso do seu pagamento é automático. Você também recebe o reembolso automático se o operador recusar sua reserva.",
  de: "Wenn du bis 24 Stunden vor der Tour stornierst, wird deine Zahlung automatisch erstattet. Du erhältst die Erstattung auch automatisch, wenn der Veranstalter deine Buchung ablehnt.",
  fr: "Si vous annulez jusqu'à 24 heures avant la visite, votre paiement est remboursé automatiquement. Vous êtes aussi remboursé automatiquement si l'opérateur refuse votre réservation.",
  it: "Se cancelli fino a 24 ore prima del tour, il pagamento ti viene rimborsato automaticamente. Ricevi il rimborso automatico anche se l'operatore rifiuta la prenotazione.",
};

// REQ-013
export function isRefundPolicyConfirmed(text: RefundText | null = CONFIRMED_REFUND_TEXT): boolean {
  return !!text && !!text.es.trim() && !!text.en.trim();
}

/** Igual que paidPolicy, pero el aviso de reembolso sale solo del texto confirmado. */
// REQ-013
export function paidPolicyConfirmed(price: PaidPrice | null, lang: string, text: RefundText | null = CONFIRMED_REFUND_TEXT): Omit<PaidPolicy, "noShow"> & { noShow: string | null; chargeNote: string } {
  const base = paidPolicy(price, lang);
  // REQ-014 (gate C, piloto): el cargo es en euros.
  // REQ-937 (D4, términos §6–7): conversión aproximada y posibles comisiones del banco.
  const chargeNote = lang === "es"
    ? "El cargo se hace en euros (EUR) en una plataforma de pago segura. Si tu tarjeta es en pesos u otra moneda, la conversión es aproximada y tu banco puede cobrar comisión."
    : "You are charged in euros (EUR) on a secure payment platform. If your card is in another currency, the conversion is approximate and your bank may charge a fee.";
  return { ...base, noShow: isRefundPolicyConfirmed(text) ? (text![lang as keyof RefundText] ?? text!.en) : null, chargeNote };
}

/** Lo que se muestra al cliente (REQ-013/014). */
export type ShownPolicy = ReturnType<typeof paidPolicyConfirmed>;
