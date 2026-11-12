import { describe, it, expect, vi, beforeEach } from "vitest";
import { cancelPurchase, onPurchaseExpired, onPurchasePaid, paxLabel, startPurchase, type OctoBookingRow, type PurchaseDeps, type RequestInfo } from "./purchase";
import { buildCatalogPlan } from "./lib/catalog";
import { availabilitySchema, bookingSchema, productSchema } from "./lib/schemas";
import { sampleBooking, sampleProduct } from "./lib/fixtures";
import { purchaseInputSchema } from "./lib/purchase";

const plan = buildCatalogPlan([productSchema.parse({ ...sampleProduct(), internalName: "New York Discover" })], ["NYC"], { NYC: ["new york"] }, new Date("2026-11-12T00:00:00Z"));
const input = purchaseInputSchema.parse({
  ref: "NYC", productId: "prod-hoho-nyc", optionId: "DEFAULT", date: "2026-12-01", units: [{ id: "unit-adult", quantity: 2 }],
  firstName: "Ana", lastName: "García", email: "ana@example.test", phone: "5512345678", consent: true,
});
const avail = availabilitySchema.parse({
  id: "2026-12-01T00:00:00-05:00", localDateTimeStart: "2026-12-01T00:00:00-05:00", localDateTimeEnd: "2026-12-01T23:59:00-05:00",
  utcCutoffAt: null, allDay: true, available: true, status: "FREESALE", vacancies: null,
  pricing: { original: 9800, retail: 9800, net: 7840, currency: "USD", currencyPrecision: 2, includedTaxes: [] },
});

function setup(over: Partial<PurchaseDeps> = {}) {
  const requests = new Map<string, Record<string, unknown>>();
  const bookings = new Map<string, OctoBookingRow>();
  const payments: Record<string, unknown>[] = [];
  const customer: { to: string; subject: string; text: string }[] = [];
  const team: { subject: string; text: string }[] = [];
  const api = {
    availability: vi.fn(async () => ({ items: [avail], discarded: 0 })),
    reserve: vi.fn(async () => bookingSchema.parse(sampleBooking({ status: "ON_HOLD", utcExpiresAt: "2026-11-12T10:45:00Z" }))),
    confirm: vi.fn(async () => bookingSchema.parse(sampleBooking())),
    cancel: vi.fn(async () => bookingSchema.parse(sampleBooking({ status: "CANCELLED" }))),
    getBooking: vi.fn(async () => bookingSchema.parse(sampleBooking())),
  };
  let n = 0;
  const info = (id: string): RequestInfo | null => {
    const r = requests.get(id);
    return r
      ? { id, ref: String(r.ref), tripTitle: String(r.tripTitle), date: String(r.date), firstName: String(r.firstName), lastName: String(r.lastName), email: String(r.email), phone: String(r.phone), optionName: (r.optionName as string) ?? null, adults: Number(r.adults), children: Number(r.children), infants: Number(r.infants) }
      : null;
  };
  const d: PurchaseDeps = {
    now: new Date("2026-11-12T10:00:00Z"), siteUrl: "https://travelpuzzle.test", logoUrl: "https://travelpuzzle.test/logo.png", cushionPct: 3,
    api, stripeEnabled: true,
    newUuid: () => "uuid-1", newId: (p) => `${p}_${++n}`, newRef: () => "SOL-20261112-AB12",
    loadPlan: async () => plan, getRates: async () => ({ USD: 18, EUR: 20, date: "2026-11-11" }), tripIdFor: (ref) => `bbt-${ref.toLowerCase()}`,
    saveRequest: async (row) => void requests.set(String(row.id), { ...row }),
    setRequestStatus: async (id, status) => void requests.set(id, { ...requests.get(id), status }),
    findRequest: async (id) => info(id),
    findRequestByRef: async (ref, email) => {
      const e = [...requests.entries()].find(([, r]) => r.ref === ref && r.email === email);
      return e ? info(e[0]) : null;
    },
    createSession: vi.fn(async () => ({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" })),
    insertPayment: async (row) => void payments.push(row),
    insertBooking: async (row) => void bookings.set(row.id, row),
    updateBooking: async (id, patch) => void bookings.set(id, { ...bookings.get(id)!, ...patch }),
    findBookingByRequest: async (rid) => [...bookings.values()].find((b) => b.requestId === rid) ?? null,
    findBookingByPayment: async (pid) => [...bookings.values()].find((b) => b.paymentId === pid) ?? null,
    sendCustomer: async (m) => void customer.push(m),
    sendTeam: async (m) => void team.push(m),
    ...over,
  };
  return { d, api, requests, bookings, payments, customer, team };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("iniciar la compra directa", () => {
  it("REQ-3418: apagado no hace nada", async () => {
    const { d, api } = setup({ api: null });
    expect(await startPurchase(input, d)).toEqual({ ok: false, code: "disabled" });
    expect(api.reserve).not.toHaveBeenCalled();
  });

  it("REQ-3418: aparta en Big Bus, abre Stripe en pesos y guarda solicitud, pago y apartado", async () => {
    const { d, api, requests, payments, bookings } = setup();
    const r = await startPurchase(input, d);
    expect(r).toEqual({ ok: true, url: "https://checkout.stripe.test/cs_1", ref: "SOL-20261112-AB12" });
    expect(api.reserve).toHaveBeenCalledWith(expect.objectContaining({ uuid: "uuid-1", availabilityId: avail.id, resellerReference: "SOL-20261112-AB12" }));
    // REQ-3436: la disponibilidad se pide en la moneda del plan (USD).
    expect(api.availability).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD" }));
    // 98 USD × 18 × 1.03 = 1,816.92 → 1,817 pesos (hacia arriba)
    expect(payments[0]).toMatchObject({ amountCentavos: 181700, originalAmount: 98, originalCurrency: "USD", kind: "total", status: "pending" });
    const params = (d.createSession as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, string>;
    expect(params.expires_at).toBe(String(Date.parse("2026-11-12T10:31:00Z") / 1000));
    expect([...requests.values()][0]).toMatchObject({ kind: "compra", status: "holding", tripId: "bbt-nyc", adults: 2 });
    expect([...bookings.values()][0]).toMatchObject({ status: "ON_HOLD", uuid: "uuid-1", paymentId: "pay_2" });
  });

  it("REQ-3418: si Stripe falla después de apartar, libera el apartado", async () => {
    const { d, api, requests } = setup({ createSession: async () => Promise.reject(new Error("stripe caído")) });
    expect(await startPurchase(input, d)).toEqual({ ok: false, code: "stripe_error" });
    expect(api.cancel).toHaveBeenCalledWith("uuid-1", "No se pudo abrir el pago");
    expect([...requests.values()][0].status).toBe("failed");
  });

  it("REQ-3418: sin lugar o fuera del plan, no aparta nada", async () => {
    const { d, api } = setup();
    api.availability.mockResolvedValueOnce({ items: [], discarded: 0 });
    expect(await startPurchase(input, d)).toEqual({ ok: false, code: "sold_out" });
    expect(await startPurchase({ ...input, ref: "LON" }, d)).toEqual({ ok: false, code: "not_found" });
    expect(api.reserve).not.toHaveBeenCalled();
  });
});

describe("después del pago", () => {
  it("REQ-3419: confirma en Big Bus y manda el boleto con la referencia", async () => {
    const { d, api, bookings, customer, requests } = setup();
    await startPurchase(input, d);
    const reqId = [...requests.keys()][0];
    expect(await onPurchasePaid(reqId, d)).toBe("confirmed");
    expect(api.confirm).toHaveBeenCalledWith("uuid-1", expect.objectContaining({ resellerReference: "SOL-20261112-AB12" }));
    expect([...bookings.values()][0]).toMatchObject({ status: "CONFIRMED", supplierReference: "BB-K3RM568F" });
    expect(customer[0].subject).toBe("Travel Puzzle / Tu boleto · SOL-20261112-AB12");
    expect(customer[0].text).toContain("BB-K3RM568F");
    expect(await onPurchasePaid(reqId, d)).toBe("already");
  });

  it("REQ-3419: si Big Bus no confirma, avisa al equipo y no reembolsa solo", async () => {
    const { d, api, team, requests } = setup();
    api.confirm.mockRejectedValueOnce(new Error("INVALID_BOOKING_STATUS"));
    await startPurchase(input, d);
    const reqId = [...requests.keys()][0];
    expect(await onPurchasePaid(reqId, d)).toBe("needs_attention");
    expect(team[0].subject).toContain("Big Bus no confirmó");
    expect(team[0].text).toContain("reembolsar al cliente según la política");
    expect(requests.get(reqId)?.status).toBe("needs_attention");
  });

  it("REQ-3419: una solicitud que no es de Big Bus no se toca", async () => {
    const { d } = setup();
    expect(await onPurchasePaid("otra", d)).toBe("not_octo");
  });

  it("REQ-3419: si el pago vence, libera el apartado en Big Bus", async () => {
    const { d, api, bookings } = setup();
    await startPurchase(input, d);
    expect(await onPurchaseExpired("pay_2", d)).toBe("released");
    expect(api.cancel).toHaveBeenCalledWith("uuid-1", "Pago no completado");
    expect([...bookings.values()][0].status).toBe("RELEASED");
    expect(await onPurchaseExpired("pay_2", d)).toBe("skipped");
  });
});

describe("cancelación del cliente", () => {
  async function confirmed() {
    const s = setup();
    await startPurchase(input, s.d);
    await onPurchasePaid([...s.requests.keys()][0], s.d);
    return s;
  }

  it("REQ-3421: dentro del corte cancela en Big Bus y avisa al equipo para el reembolso", async () => {
    const { d, api, team, customer, requests } = await confirmed();
    expect(await cancelPurchase({ ref: "SOL-20261112-AB12", email: " Ana@Example.test " }, d)).toBe("cancelled");
    expect(api.cancel).toHaveBeenCalledWith("uuid-1", "Cancelación del cliente");
    expect([...requests.values()][0].status).toBe("cancel_refund_pending");
    expect(customer.at(-1)?.subject).toContain("Cancelación recibida");
    expect(team.at(-1)?.subject).toContain("procesar el reembolso");
  });

  it("REQ-3421: fuera del corte no cancela", async () => {
    const { d, api } = await confirmed();
    api.getBooking.mockResolvedValueOnce(bookingSchema.parse(sampleBooking({ cancellable: false })));
    expect(await cancelPurchase({ ref: "SOL-20261112-AB12", email: "ana@example.test" }, d)).toBe("not_cancellable");
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it("REQ-3421: con otro correo no encuentra la compra", async () => {
    const { d } = await confirmed();
    expect(await cancelPurchase({ ref: "SOL-20261112-AB12", email: "otro@example.test" }, d)).toBe("not_found");
  });

  it("REQ-3420: personas en texto para el boleto", () => {
    expect(paxLabel({ adults: 2, children: 1, infants: 0 })).toBe("2 adultos, 1 niño");
  });
});
