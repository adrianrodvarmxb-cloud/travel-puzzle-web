/**
 * Lo que el cliente ve antes de reservar un tour con costo, con el mismo esquema que Freetour
 * (freetour.com/help): depósito al reservar, el resto en el punto de encuentro, y el depósito no se
 * reembolsa si cancela o no se presenta. Pura. Se muestra solo con PAID_TOURS_ENABLED.
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

export function paidPolicy(price: PaidPrice | null, lang: string): PaidPolicy {
  const es = lang === "es";
  const partial = !!price && price.isPartiallyPaid && price.payNow < price.fullPrice;
  const payment = !price
    ? null
    : partial
      ? es
        ? `Hoy pagas un depósito de ${money(price.currency, price.payNow)}; el resto, ${money(price.currency, price.fullPrice - price.payNow)}, se paga en el punto de encuentro.`
        : `Today you pay a ${money(price.currency, price.payNow)} deposit; the rest, ${money(price.currency, price.fullPrice - price.payNow)}, is paid at the meeting point.`
      : es
        ? `Pagas ${money(price.currency, price.fullPrice)} al reservar.`
        : `You pay ${money(price.currency, price.fullPrice)} when booking.`;
  const what = !price ? (es ? "Lo que pagues al reservar" : "What you pay when booking") : partial ? (es ? "El depósito" : "The deposit") : es ? "El pago" : "The payment";
  return {
    payment,
    cancel: es ? "Si no puedes ir, cancela desde el enlace de tu correo de confirmación." : "If you can't make it, cancel from the link in your confirmation email.",
    noShow: es ? `${what} no es reembolsable si cancelas o no te presentas.` : `${what} is non-refundable if you cancel or don't show up.`,
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
  const chargeNote = lang === "es" ? "El cargo se hace en euros (EUR) en una plataforma de pago segura." : "You are charged in euros (EUR) on a secure payment platform.";
  return { ...base, noShow: isRefundPolicyConfirmed(text) ? (text![lang as keyof RefundText] ?? text!.en) : null, chargeNote };
}

/** Lo que se muestra al cliente (REQ-013/014). */
export type ShownPolicy = ReturnType<typeof paidPolicyConfirmed>;
