// Lista cerrada de operaciones que la pasarela puede hacer en Freetour.
// Valida y arma la petición exacta; cualquier otra cosa se rechaza.

const isInt = (v, min = 0) => Number.isInteger(v) && v >= min;
const isStr = (v, max = 200) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const isEmail = (v) => isStr(v, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isHttpsUrl = (v) => {
  try { return isStr(v, 2000) && new URL(v).protocol === "https:"; } catch { return false; }
};
const seg = (v) => encodeURIComponent(String(v));
const bad = (reason) => ({ ok: false, reason });

const bookingRef = (p) => isStr(p.refNumber, 64) && isInt(p.eventId, 1) && isInt(p.adults, 1) && isInt(p.children, 0);
const pickRef = (p) => ({ refNumber: p.refNumber, eventId: p.eventId, adults: p.adults, children: p.children });

const OPERATIONS = {
  createBooking(p) {
    const c = p.customer ?? {};
    if (!isInt(p.eventId, 1) || !isInt(p.adults, 1) || !isInt(p.children, 0)) return bad("datos de la reserva");
    if (typeof p.price !== "number" || p.price < 0) return bad("precio");
    if (!isEmail(c.email) || !isStr(c.firstName, 100) || !isStr(c.lastName, 100)) return bad("cliente");
    if (c.phone !== undefined && !/^\+\d{6,16}$/.test(c.phone)) return bad("teléfono");
    const customer = { email: c.email, firstName: c.firstName, lastName: c.lastName, ...(c.phone && { phone: c.phone }) };
    return { ok: true, method: "POST", path: "/booking", body: { eventId: p.eventId, adults: p.adults, children: p.children, price: p.price, customer } };
  },
  getBooking(p) {
    return isStr(p.refNumber, 64) ? { ok: true, method: "GET", path: `/booking/${seg(p.refNumber)}` } : bad("refNumber");
  },
  cancelBooking(p) {
    return bookingRef(p) ? { ok: true, method: "POST", path: "/booking/cancel", body: pickRef(p) } : bad("datos de cancelación");
  },
  editBooking(p) {
    return bookingRef(p) ? { ok: true, method: "POST", path: "/booking/edit", body: pickRef(p) } : bad("datos del cambio");
  },
  getEventForEdit(p) {
    return isInt(p.eventId, 1) && isStr(p.refNumber, 64)
      ? { ok: true, method: "GET", path: `/event/${p.eventId}/${seg(p.refNumber)}` }
      : bad("evento");
  },
  createPayment(p) {
    if (!isStr(p.refNumber, 64) || !isHttpsUrl(p.successUrl) || !isHttpsUrl(p.cancelUrl)) return bad("datos del pago");
    return { ok: true, method: "POST", path: "/payment", body: { refNumber: p.refNumber, successUrl: p.successUrl, cancelUrl: p.cancelUrl } };
  },
  getPaymentStatus(p) {
    return isStr(p.checkoutSessionId, 200) ? { ok: true, method: "GET", path: `/payment/${seg(p.checkoutSessionId)}` } : bad("checkoutSessionId");
  },
};

export const OPERATION_NAMES = Object.keys(OPERATIONS);

export function toFreetourRequest(op, payload) {
  const fn = Object.hasOwn(OPERATIONS, op) ? OPERATIONS[op] : null;
  if (!fn) return bad("operación no permitida");
  return fn(payload && typeof payload === "object" ? payload : {});
}
