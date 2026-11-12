// Puro · REQ-1298 (P9) y REQ-1299 (P10): qué pedirle a un proveedor, en el orden de preferencia del PO.
export type Integracion = "api" | "plugin" | "portal" | "manual" | "desconocida";
export type Cobro = "proveedor" | "travelpuzzle" | "desconocido";

const ES = {
  api: "Si tienen API para agencias (disponibilidad, reserva y cancelación), ¿nos comparten la documentación y un ambiente de prueba? Es nuestra opción preferida.",
  plugin: "Si no tienen API, ¿tienen algún plugin, widget o liga de reserva que podamos integrar en nuestra página?",
  portal: "Si trabajan con un portal para agencias, ¿nos dan de alta un usuario para Mila (comercial@travelpuzzle.com.mx)?",
  manual: "Si las reservas son por correo o WhatsApp: ¿con quién nos dirigimos, por qué canal y en cuánto tiempo suelen confirmar disponibilidad?",
  cobroProveedor: "Para el pago, preferimos que ustedes cobren directo al viajero (por ejemplo, con una liga de pago que le reenviamos) y nos paguen la comisión. ¿Es posible?",
  cobroNosotros: "Si no es posible, ¿nos comparten los datos bancarios para depositarles el pago de cada reserva?",
  dmcCondiciones: "Sus condiciones de pago para agencias: si piden depósito o anticipo, cuánto y en qué plazo se liquida el saldo. Nosotros cobramos al viajero y les pagamos la tarifa neta.",
  dmcBanco: "Los datos bancarios (cuenta, banco, SWIFT o CLABE y moneda) para depositarles la tarifa neta de cada reserva.",
  plataforma: "¿Cómo cobran la reserva al viajero (liga de pago o checkout propio), qué porcentaje de comisión nos corresponde y cómo y cuándo la pagan?",
};
const EN = {
  api: "If you have an API for agencies (availability, booking and cancellation), could you share the documentation and a test environment? It is our preferred option.",
  plugin: "If there is no API, do you have a plugin, widget or booking link we could integrate into our website?",
  portal: "If you work with an agent portal, could you set up a user for Mila (comercial@travelpuzzle.com.mx)?",
  manual: "If bookings are by email or WhatsApp: who should we contact, through which channel, and how long do you usually take to confirm availability?",
  cobroProveedor: "For payment, we prefer that you charge the traveler directly (for example, with a payment link we forward) and pay us a commission. Is that possible?",
  cobroNosotros: "If not, could you share your bank details so we can transfer the payment for each booking?",
  dmcCondiciones: "Your payment terms for agencies: whether you require a deposit, how much, and when the balance is due. We charge the traveler and pay you the net rate.",
  dmcBanco: "Your bank details (account, bank, SWIFT and currency) to pay you the net rate for each booking.",
  plataforma: "How do you charge the traveler (payment link or your own checkout), what commission percentage applies to us, and how and when is it paid?",
};

const ORDEN: Exclude<Integracion, "desconocida">[] = ["api", "plugin", "portal", "manual"];

// REQ-1298: pide desde lo mejor hacia abajo; si ya sabemos que tiene una vía, solo pide las mejores que esa (puede que no las conozcamos).
export function pedidosDeIntegracion(actual: Integracion, idioma: "es" | "en" = "es"): string[] {
  const t = idioma === "en" ? EN : ES;
  if (actual === "api") return [];
  // Con «manual» también se pide la persona, el canal y el tiempo de respuesta (P9): eso va al directorio.
  const hasta = actual === "desconocida" || actual === "manual" ? ORDEN.length : ORDEN.indexOf(actual);
  return ORDEN.slice(0, hasta).map((k) => t[k]);
}

// REQ-1299: primero que cobren ellos; la cuenta bancaria solo como segunda opción.
// REQ-1573 (P10b): con tipo, el DMC con neto cobra por Travel Puzzle (acuerdo) y la plataforma cobra ella y paga comisión.
// Sin tipo se conserva el comportamiento anterior (LSP).
export function pedidosDeCobro(cobro: Cobro, idioma: "es" | "en" = "es", tipo?: "dmc" | "plataforma" | "api"): string[] {
  const t = idioma === "en" ? EN : ES;
  if (tipo === "dmc") return [t.dmcCondiciones, t.dmcBanco];
  if (tipo) return cobro === "proveedor" ? [] : [t.plataforma];
  if (cobro === "proveedor") return [];
  if (cobro === "travelpuzzle") return [t.cobroProveedor];
  return [t.cobroProveedor, t.cobroNosotros];
}

export const numerar = (xs: string[]) => xs.map((x, i) => `${i + 1}. ${x}`).join("\n");
