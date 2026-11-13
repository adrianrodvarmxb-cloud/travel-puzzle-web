import { describe, it, expect, vi } from "vitest";
import { applySupplierDecision, onDirectBuyPaid, refundOverdue, startDirectBuy, type BuyDeps, type BuyRecord, type BuyTrip } from "./direct-buy";
import { requestInputSchema } from "./schemas/request";
import { signSupplierLink } from "./lib/direct-buy";

const trip: BuyTrip = {
  id: "t1", code: "IWP-PE-T01-029", titleEs: "Chullpas de Sillustani", kind: "tour", purchaseMode: "buy", currency: "MXN", minNoticeHours: 24,
  options: [{ id: "g1", name: "En grupo", mode: "group", adult: 1000, child: 600, infant: 0, childAgeMin: 3, childAgeMax: 11 }],
  availability: { weekdays: [5], slots: [{ time: "09:00", capacity: 10 }], closedDates: [], seasons: [] },
};
const parsed = requestInputSchema.parse({ kind: "reserva", tripId: "t1", date: "2027-03-05", time: "09:00", optionId: "g1", firstName: "Ana", lastName: "Pérez", email: "ana@example.com", phone: "+52 55 1234 5678", adults: 2, children: 1, childAges: [7], consent: true });
const input = parsed as Extract<typeof parsed, { kind: "reserva" }>;

/** Base en memoria: la lógica corre completa; solo Stripe y el correo son dobles. */
function setup(over: Partial<BuyDeps> & { tripOver?: Partial<BuyTrip> } = {}) {
  const requests = new Map<string, Record<string, unknown>>();
  const payments = new Map<string, Record<string, unknown>>();
  let n = 0;
  const d: BuyDeps = {
    now: new Date("2027-03-01T12:00:00Z"), siteUrl: "https://travelpuzzle.com.mx", logoUrl: "https://tp/logo.png", cushionPct: 3, secret: "s3creto",
    enabled: true, stripeEnabled: true,
    newId: (p) => `${p}_${++n}`, random: () => "ab12cd",
    findTrip: vi.fn(async () => ({ ...trip, ...over.tripOver })),
    getRates: vi.fn(async () => ({ MXN: 1, USD: 18, EUR: 20 }) as never),
    saveRequest: vi.fn(async (row) => { requests.set(row.id as string, { ...row }); }),
    createSession: vi.fn(async () => ({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" })),
    insertPayment: vi.fn(async (row) => { payments.set(row.id as string, { ...row }); }),
    findBuy: vi.fn(async (id): Promise<BuyRecord | null> => {
      const r = requests.get(id);
      if (!r) return null;
      const p = [...payments.values()].find((x) => x.requestId === id && x.status === "paid");
      return {
        id, ref: r.ref as string, kind: r.kind as string, status: r.status as string, tripTitle: r.tripTitle as string, tripCode: r.tripCode as string,
        date: r.date as string, time: r.time as string, optionName: r.optionName as string, adults: r.adults as number, children: r.children as number, infants: r.infants as number,
        firstName: r.firstName as string, lastName: r.lastName as string, email: r.email as string, hotel: (r.hotel as string) ?? "", supplierEmail: "reservas@incaworld.pe",
        payment: p ? { id: p.id as string, paymentIntent: p.paymentIntent as string, amountCentavos: p.amountCentavos as number, paidAt: p.paidAt as Date } : null,
      };
    }),
    transition: vi.fn(async (id, from, to) => {
      const r = requests.get(id);
      if (!r || !from.includes(r.status as string)) return false;
      r.status = to;
      return true;
    }),
    refund: vi.fn(async () => ({ id: "re_1" })),
    listAwaitingSupplier: vi.fn(async () =>
      [...requests.values()].filter((r) => r.status === "awaiting_supplier").map((r) => ({ id: r.id as string, paidAt: ([...payments.values()].find((p) => p.requestId === r.id)?.paidAt as Date) ?? null }))),
    sendCustomer: vi.fn(async () => {}), sendSupplier: vi.fn(async () => {}), sendTeam: vi.fn(async () => {}),
    ...over,
  };
  /** Lo que haría el webhook de Stripe: marca el pago y la solicitud como pagados. */
  const pay = (paidAt: Date) => {
    for (const p of payments.values()) Object.assign(p, { status: "paid", paymentIntent: "pi_1", paidAt });
    for (const r of requests.values()) r.status = "paid";
  };
  return { d, requests, payments, pay };
}

describe("startDirectBuy (REQ-3533)", () => {
  it("REQ-3533: cobra el total calculado por el sistema, sin monto a mano ni aprobación", async () => {
    const { d, requests, payments } = setup();
    expect(await startDirectBuy(input, d)).toEqual({ ok: true, url: "https://checkout.stripe.com/c/cs_1", ref: "SOL-20270301-AB12" });
    const [req] = [...requests.values()];
    expect(req).toMatchObject({ kind: "compra", status: "awaiting_payment", estimate: 2600, currency: "MXN" });
    const params = (d.createSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(params["line_items[0][price_data][unit_amount]"]).toBe("260000");
    expect(params["metadata[kind]"]).toBe("total");
    expect([...payments.values()][0]).toMatchObject({ kind: "total", amountCentavos: 260000, status: "pending" });
  });

  it("REQ-3533: en dólares cobra en pesos con el FIX y el colchón, hacia arriba", async () => {
    const { d } = setup({ tripOver: { currency: "USD", options: [{ ...trip.options[0], adult: 10, child: null }] } });
    const one = { ...input, children: 0, childAges: [] } as typeof input;
    expect((await startDirectBuy(one, d)).ok).toBe(true);
    const params = (d.createSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // 2 × 10 USD × 18 × 1.03 = 370.8 → 371 pesos
    expect(params["line_items[0][price_data][unit_amount]"]).toBe("37100");
  });

  it("REQ-3533: viaje en modo «cotizar», bandera apagada o sin precio completo: no cobra", async () => {
    expect(await startDirectBuy(input, setup({ tripOver: { purchaseMode: "quote" } }).d)).toMatchObject({ ok: false, code: "disabled" });
    expect(await startDirectBuy(input, setup({ enabled: false }).d)).toMatchObject({ ok: false, code: "disabled" });
    const noChild = setup({ tripOver: { options: [{ ...trip.options[0], child: null }] } });
    expect(await startDirectBuy(input, noChild.d)).toMatchObject({ ok: false, code: "no_price" });
    expect(noChild.d.createSession).not.toHaveBeenCalled();
  });

  it("REQ-3533: fecha u horario que no opera: no cobra", async () => {
    const { d } = setup();
    expect(await startDirectBuy({ ...input, date: "2027-03-04" }, d)).toMatchObject({ ok: false, code: "bad_date" });
    expect(await startDirectBuy({ ...input, time: "11:00" }, d)).toMatchObject({ ok: false, code: "bad_time" });
    expect(d.saveRequest).not.toHaveBeenCalled();
  });

  it("REQ-3533: si Stripe falla, la solicitud queda como fallida y no hay cobro", async () => {
    const { d, requests, payments } = setup({ createSession: vi.fn(async () => { throw new Error("Stripe 500"); }) });
    expect(await startDirectBuy(input, d)).toMatchObject({ ok: false, code: "stripe_error" });
    expect([...requests.values()][0].status).toBe("failed");
    expect(payments.size).toBe(0);
  });
});

describe("después del pago y decisión del proveedor (REQ-3534)", () => {
  async function paid() {
    const s = setup();
    await startDirectBuy(input, s.d);
    s.pay(new Date("2027-03-01T12:05:00Z"));
    const id = [...s.requests.keys()][0];
    return { ...s, id };
  }

  it("REQ-3534: al pagar avisa al cliente (48 h) y al proveedor con su enlace; el equipo solo recibe aviso", async () => {
    const { d, id, requests } = await paid();
    expect(await onDirectBuyPaid(id, d)).toBe(true);
    expect(requests.get(id)!.status).toBe("awaiting_supplier");
    expect(d.sendCustomer).toHaveBeenCalledWith(expect.objectContaining({ to: "ana@example.com", subject: expect.stringContaining("Recibimos tu pago") }));
    const sig = await signSupplierLink("s3creto", id);
    expect(d.sendSupplier).toHaveBeenCalledWith(expect.objectContaining({ to: "reservas@incaworld.pe", text: expect.stringContaining(`sig=${encodeURIComponent(sig)}`) }));
    // Al proveedor no le llega lo que pagó el cliente (lleva el margen).
    const supplierText = (d.sendSupplier as ReturnType<typeof vi.fn>).mock.calls[0][0].text as string;
    expect(supplierText).not.toContain("MXN");
  });

  it("REQ-3534: un aviso repetido de Stripe no repite correos; otra solicitud no es de compra directa", async () => {
    const { d, id } = await paid();
    await onDirectBuyPaid(id, d);
    expect(await onDirectBuyPaid(id, d)).toBe(true);
    expect(d.sendSupplier).toHaveBeenCalledTimes(1);
    expect(await onDirectBuyPaid("no-existe", d)).toBe(false);
  });

  it("REQ-3534: el proveedor confirma → viaje confirmado, sin reembolso", async () => {
    const { d, id, requests } = await paid();
    await onDirectBuyPaid(id, d);
    expect(await applySupplierDecision(id, "confirm", d, await signSupplierLink("s3creto", id))).toBe("confirmed");
    expect(requests.get(id)!.status).toBe("confirmed");
    expect(d.refund).not.toHaveBeenCalled();
    expect(d.sendCustomer).toHaveBeenLastCalledWith(expect.objectContaining({ subject: expect.stringContaining("confirmado") }));
  });

  it("REQ-3534: «No hay lugar» → reembolso total automático, una sola vez", async () => {
    const { d, id, requests } = await paid();
    await onDirectBuyPaid(id, d);
    const sig = await signSupplierLink("s3creto", id);
    expect(await applySupplierDecision(id, "decline", d, sig)).toBe("refunded");
    expect(d.refund).toHaveBeenCalledWith("pi_1", "reembolso-pay_2");
    expect(requests.get(id)!.status).toBe("refunded");
    expect(await applySupplierDecision(id, "decline", d, sig)).toBe("already");
    expect(await applySupplierDecision(id, "confirm", d, sig)).toBe("already");
    expect(d.refund).toHaveBeenCalledTimes(1);
  });

  it("REQ-3534: enlace con firma falsa no decide nada", async () => {
    const { d, id, requests } = await paid();
    await onDirectBuyPaid(id, d);
    expect(await applySupplierDecision(id, "decline", d, "falsa")).toBe("invalid");
    expect(requests.get(id)!.status).toBe("awaiting_supplier");
  });

  it("REQ-3534: si Stripe no reembolsa, queda en refund_failed y se avisa al equipo", async () => {
    const { d, id, requests } = await paid();
    d.refund = vi.fn(async () => { throw new Error("Stripe 402"); });
    await onDirectBuyPaid(id, d);
    expect(await applySupplierDecision(id, "decline", d, await signSupplierLink("s3creto", id))).toBe("refund_failed");
    expect(requests.get(id)!.status).toBe("refund_failed");
    expect(d.sendTeam).toHaveBeenLastCalledWith(expect.objectContaining({ subject: expect.stringContaining("REEMBOLSO FALLÓ") }));
  });

  it("REQ-3534: a las 48 h sin respuesta se reembolsa sola; antes no", async () => {
    const { d, id, requests } = await paid();
    await onDirectBuyPaid(id, d);
    expect(await refundOverdue({ ...d, now: new Date("2027-03-03T12:04:00Z") })).toEqual({ checked: 1, refunded: 0, failed: 0 });
    expect(requests.get(id)!.status).toBe("awaiting_supplier");
    expect(await refundOverdue({ ...d, now: new Date("2027-03-03T12:05:00Z") })).toEqual({ checked: 1, refunded: 1, failed: 0 });
    expect(requests.get(id)!.status).toBe("refunded");
  });
});
