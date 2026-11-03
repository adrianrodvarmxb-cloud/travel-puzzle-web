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
