import { describe, it, expect, vi } from "vitest";
import { createPaymentLink, handleStripeWebhook, type LinkDeps, type WebhookDeps, type PaymentRow } from "./service";

const request = { id: "req_1", ref: "TP-ABC", tripTitle: "Machu Picchu 2D", email: "ana@example.com", firstName: "Ana", language: "es" };

function linkDeps(over: Partial<LinkDeps> = {}): LinkDeps & { rows: PaymentRow[] } {
  const rows: PaymentRow[] = [];
  return {
    rows,
    enabled: true,
    now: new Date("2026-11-05T17:00:00Z"),
    cushionPct: 3,
    siteUrl: "https://travelpuzzle.com.mx",
    logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png",
    newId: () => "pay_new",
    findRequest: vi.fn(async (id: string) => (id === "req_1" ? request : null)),
    getRates: vi.fn(async () => ({ USD: 18.5, EUR: 20, date: "05/11/2026" })),
    listPending: vi.fn(async () => [] as { id: string; sessionId: string }[]),
    expireSession: vi.fn(async () => undefined),
    markReplaced: vi.fn(async () => undefined),
    createSession: vi.fn(async () => ({ id: "cs_new", url: "https://checkout.stripe.com/c/pay/cs_new" })),
    insertPayment: vi.fn(async (r: PaymentRow) => { rows.push(r); }),
    setRequestStatus: vi.fn(async () => undefined),
    sendCustomer: vi.fn(async () => "msg"),
    ...over,
  };
}

describe("createPaymentLink", () => {
  it("REQ-114: crea Checkout, guarda el pago pendiente, marca Cotizada y manda el enlace", async () => {
    const d = linkDeps();
    const r = await createPaymentLink({ requestId: "req_1", amount: 100, currency: "USD", kind: "anticipo" }, d);
    expect(r).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_new", centavos: 190600 });
    const params = (d.createSession as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, string>;
    expect(params["metadata[payment_id]"]).toBe("pay_new");
    expect(params["line_items[0][price_data][unit_amount]"]).toBe("190600");
    expect(d.rows[0]).toMatchObject({
      id: "pay_new", requestId: "req_1", kind: "anticipo", amountCentavos: 190600, currency: "MXN",
      originalAmount: 100, originalCurrency: "USD", fxRate: 18.5, fxCushionPct: 3,
      stripeSessionId: "cs_new", status: "pending",
    });
    expect(d.setRequestStatus).toHaveBeenCalledWith("req_1", "quoted");
    const mail = (d.sendCustomer as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(mail.to).toBe("ana@example.com");
    expect(mail.html).toContain("https://checkout.stripe.com/c/pay/cs_new");
    expect(mail.text).toContain("24 horas");
  });

  it("REQ-119: el registro guarda monto, moneda original, tipo de cambio, colchón, sesión y vencimiento de 24 h", async () => {
    const d = linkDeps();
    await createPaymentLink({ requestId: "req_1", amount: 50, currency: "EUR", kind: "liquidacion" }, d);
    const row = d.rows[0];
    expect(row).toMatchObject({ kind: "liquidacion", amountCentavos: 103000, currency: "MXN", originalAmount: 50, originalCurrency: "EUR", fxRate: 20, fxCushionPct: 3, stripeSessionId: "cs_new", status: "pending" });
    const hours = (row.expiresAt.getTime() - d.now.getTime()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
    const mxn = linkDeps();
    await createPaymentLink({ requestId: "req_1", amount: 5000, currency: "MXN", kind: "total" }, mxn);
    expect(mxn.rows[0]).toMatchObject({ fxRate: null, fxCushionPct: 0, amountCentavos: 500000 });
  });

  it("REQ-116: reenviar vence los enlaces pendientes anteriores antes de crear el nuevo", async () => {
    const order: string[] = [];
    const d = linkDeps({
      listPending: vi.fn(async () => [{ id: "pay_old", sessionId: "cs_old" }]),
      expireSession: vi.fn(async () => { order.push("expire"); }),
      markReplaced: vi.fn(async () => { order.push("replaced"); }),
      createSession: vi.fn(async () => { order.push("create"); return { id: "cs_new", url: "u" }; }),
    });
    await createPaymentLink({ requestId: "req_1", amount: 5000, currency: "MXN", kind: "total" }, d);
    expect(d.expireSession).toHaveBeenCalledWith("cs_old");
    expect(d.markReplaced).toHaveBeenCalledWith("pay_old");
    expect(order).toEqual(["expire", "replaced", "create"]);
  });

  it("REQ-116: si el enlace viejo ya no se puede vencer (ya venció), se marca reemplazado y se sigue", async () => {
    const d = linkDeps({
      listPending: vi.fn(async () => [{ id: "pay_old", sessionId: "cs_old" }]),
      expireSession: vi.fn(async () => { throw new Error("already expired"); }),
    });
    const r = await createPaymentLink({ requestId: "req_1", amount: 5000, currency: "MXN", kind: "total" }, d);
    expect(r.ok).toBe(true);
    expect(d.markReplaced).toHaveBeenCalledWith("pay_old");
  });

  it("REQ-118: con la bandera apagada no hace nada", async () => {
    const d = linkDeps({ enabled: false });
    expect(await createPaymentLink({ requestId: "req_1", amount: 5000, currency: "MXN", kind: "total" }, d)).toEqual({ ok: false, code: "disabled" });
    expect(d.createSession).not.toHaveBeenCalled();
  });

  it("REQ-115: sin tipo de cambio o monto bajo no se genera enlace", async () => {
    const noFx = linkDeps({ getRates: vi.fn(async () => null) });
    expect(await createPaymentLink({ requestId: "req_1", amount: 100, currency: "USD", kind: "total" }, noFx)).toEqual({ ok: false, code: "no_fx" });
    const low = linkDeps();
    expect(await createPaymentLink({ requestId: "req_1", amount: 5, currency: "MXN", kind: "total" }, low)).toEqual({ ok: false, code: "invalid_amount" });
    expect(noFx.createSession).not.toHaveBeenCalled();
    expect(low.createSession).not.toHaveBeenCalled();
  });

  it("REQ-114: solicitud inexistente → not_found, sin tocar Stripe", async () => {
    const d = linkDeps();
    expect(await createPaymentLink({ requestId: "nope", amount: 5000, currency: "MXN", kind: "total" }, d)).toEqual({ ok: false, code: "not_found" });
    expect(d.createSession).not.toHaveBeenCalled();
  });

  it("REQ-114: si Stripe falla no se guarda nada ni se manda correo", async () => {
    const d = linkDeps({ createSession: vi.fn(async () => { throw new Error("stripe 500"); }) });
    expect(await createPaymentLink({ requestId: "req_1", amount: 5000, currency: "MXN", kind: "total" }, d)).toEqual({ ok: false, code: "stripe_error" });
    expect(d.rows).toHaveLength(0);
    expect(d.sendCustomer).not.toHaveBeenCalled();
  });
});

describe("handleStripeWebhook", () => {
  const paidEvent = JSON.stringify({
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_status: "paid", amount_total: 190600, currency: "mxn", payment_intent: "pi_1", metadata: { payment_id: "pay_1" } } },
  });
  const payment = { id: "pay_1", requestId: "req_1", kind: "anticipo" as const, amountCentavos: 190600 };

  function whDeps(over: Partial<WebhookDeps> = {}): WebhookDeps {
    return {
      enabled: true,
      secret: "whsec_x",
      now: new Date("2026-11-05T17:00:00Z"),
      siteUrl: "https://travelpuzzle.com.mx",
      logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png",
      verify: vi.fn(async () => true),
      markPaid: vi.fn(async () => payment),
      markExpired: vi.fn(async () => undefined),
      findRequest: vi.fn(async () => request),
      setRequestStatus: vi.fn(async () => undefined),
      sendCustomer: vi.fn(async () => "m"),
      sendTeam: vi.fn(async () => "m"),
      ...over,
    };
  }

  it("REQ-117: firma inválida → invalid, sin tocar nada", async () => {
    const d = whDeps({ verify: vi.fn(async () => false) });
    expect(await handleStripeWebhook(paidEvent, "t=1,v1=x", d)).toBe("invalid");
    expect(d.markPaid).not.toHaveBeenCalled();
  });

  it("REQ-117: pago completado → pagado, solicitud Pagada y correos a cliente y equipo", async () => {
    const d = whDeps();
    expect(await handleStripeWebhook(paidEvent, "sig", d)).toBe("paid");
    expect(d.markPaid).toHaveBeenCalledWith("pay_1", { sessionId: "cs_1", paymentIntent: "pi_1", amountCentavos: 190600, paidAt: d.now });
    expect(d.setRequestStatus).toHaveBeenCalledWith("req_1", "paid");
    expect(d.sendCustomer).toHaveBeenCalledTimes(1);
    expect(d.sendTeam).toHaveBeenCalledTimes(1);
    const team = (d.sendTeam as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(team.subject).toContain("TP-ABC");
  });

  it("REQ-117: aviso repetido (ya pagado) no duplica correos", async () => {
    const d = whDeps({ markPaid: vi.fn(async () => null) });
    expect(await handleStripeWebhook(paidEvent, "sig", d)).toBe("duplicate");
    expect(d.sendCustomer).not.toHaveBeenCalled();
    expect(d.setRequestStatus).not.toHaveBeenCalled();
  });

  it("REQ-117: sesión vencida → vencido", async () => {
    const d = whDeps();
    const ev = JSON.stringify({ type: "checkout.session.expired", data: { object: { id: "cs_1", metadata: { payment_id: "pay_1" } } } });
    expect(await handleStripeWebhook(ev, "sig", d)).toBe("expired");
    expect(d.markExpired).toHaveBeenCalledWith("pay_1");
  });

  it("REQ-118: con la bandera apagada → disabled", async () => {
    const d = whDeps({ enabled: false });
    expect(await handleStripeWebhook(paidEvent, "sig", d)).toBe("disabled");
    expect(d.verify).not.toHaveBeenCalled();
  });

  it("REQ-117: cuerpo que no es JSON tras firma válida → ignored", async () => {
    expect(await handleStripeWebhook("no-json", "sig", whDeps())).toBe("ignored");
  });
});
