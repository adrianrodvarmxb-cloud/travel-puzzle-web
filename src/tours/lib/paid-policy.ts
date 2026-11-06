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
