import { describe, expect, it, vi } from "vitest";
import { confirmPayment, expirePayment, resumePayment, retryPendingPayments, startPayment, type PaymentRow } from "./payment";
import { GatewayError } from "./gateway-client";

const now = new Date("2026-11-04T12:00:00Z");
const row = (p: Partial<PaymentRow> = {}): PaymentRow => ({ refNumber: "TP1", manageToken: "tok", checkoutSessionId: "cs_1", paymentStatus: "pending", paymentExpiresAt: "2026-11-05T12:00:00Z", paymentCheckedAt: null, paymentUrl: "https://checkout.stripe.com/old", eventUtcDate: "2026-11-09T10:00:00Z", eventId: 77, adults: 2, children: 0, status: "pending_payment", ...p });

describe("startPayment", () => {
  it("REQ-011: pide el checkout a Freetour con URLs https y guarda la sesión", async () => {
    const createPayment = vi.fn(async () => ({ paymentUrl: "https://checkout.stripe.com/x", checkoutSessionId: "cs_9", createdAt: "", expiresAt: "2026-11-05T12:00:00Z" }));
    const savePayment = vi.fn(async () => {});
    const url = await startPayment({ refNumber: "TP1", manageToken: "tok" }, { createPayment, savePayment, siteUrl: "https://travelpuzzle.com.mx" });
    expect(url).toBe("https://checkout.stripe.com/x");
    expect(createPayment).toHaveBeenCalledWith({ refNumber: "TP1", successUrl: "https://travelpuzzle.com.mx/reserva/tok/pago/exito", cancelUrl: "https://travelpuzzle.com.mx/reserva/tok/pago/cancelado" });
    expect(savePayment).toHaveBeenCalledWith("TP1", { checkoutSessionId: "cs_9", paymentUrl: "https://checkout.stripe.com/x", paymentStatus: "pending", paymentExpiresAt: "2026-11-05T12:00:00Z" });
  });
});

describe("confirmPayment", () => {
  const deps = (status: () => Promise<{ paymentStatus: number }>, r = row()) => ({
    load: vi.fn(async () => r), getPaymentStatus: vi.fn(status), markPayment: vi.fn(async () => {}), sendConfirmation: vi.fn(async () => {}), now,
  });
  it("REQ-012: pagado → marca pagado y manda la confirmación una sola vez", async () => {
    const d = deps(async () => ({ paymentStatus: 1 }));
    expect(await confirmPayment("tok", d)).toBe("paid");
    expect(d.markPayment).toHaveBeenCalledWith("TP1", "paid", now);
    expect(d.sendConfirmation).toHaveBeenCalledTimes(1);
  });
  it("REQ-012: si ya estaba pagado no vuelve a mandar el correo ni consulta", async () => {
    const d = deps(async () => ({ paymentStatus: 1 }), row({ paymentStatus: "paid" }));
    expect(await confirmPayment("tok", d)).toBe("paid");
    expect(d.getPaymentStatus).not.toHaveBeenCalled();
    expect(d.sendConfirmation).not.toHaveBeenCalled();
  });
  it("REQ-012: error 63 (sin pagar) → pendiente, sin correo", async () => {
    const d = deps(async () => { throw new GatewayError("unpaid", 400, 63); });
    expect(await confirmPayment("tok", d)).toBe("pending");
    expect(d.markPayment).toHaveBeenCalledWith("TP1", "pending", now);
    expect(d.sendConfirmation).not.toHaveBeenCalled();
  });
  it("REQ-012: una reserva gratis (sin sesión de pago) no pasa por el cobro", async () => {
    const d = deps(async () => ({ paymentStatus: 1 }), row({ checkoutSessionId: null, paymentStatus: null }));
    expect(await confirmPayment("tok", d)).toBe("not_paid_tour");
    expect(d.getPaymentStatus).not.toHaveBeenCalled();
  });
});

describe("retryPendingPayments", () => {
  it("REQ-012: solo reintenta las pendientes sin vencer y con 10 min desde la última consulta", async () => {
    const rows = [row({ refNumber: "A" }), row({ refNumber: "B", paymentCheckedAt: "2026-11-04T11:58:00Z" }), row({ refNumber: "C", paymentExpiresAt: "2026-11-04T10:00:00Z" })];
    const confirm = vi.fn(async (_token: string) => "pending" as const);
    const expire = vi.fn(async () => {});
    const out = await retryPendingPayments({ listPending: async () => rows, confirm, expire, now });
    expect(confirm.mock.calls.map((c) => c[0])).toEqual(["tok"]);
    expect(expire).toHaveBeenCalledWith(expect.objectContaining({ refNumber: "C" }), now);
    expect(out).toEqual({ checked: 1, expired: 1 });
  });
});

describe("REQ-933 confirmPayment respeta 10 min tras un error 63", () => {
  it("REQ-933: pendiente consultada hace 3 min → no llama a GET /payment", async () => {
    const d = { load: vi.fn(async () => row({ paymentCheckedAt: "2026-11-04T11:57:00Z" })), getPaymentStatus: vi.fn(async () => ({ paymentStatus: 1 })), markPayment: vi.fn(async () => {}), sendConfirmation: vi.fn(async () => {}), now };
    expect(await confirmPayment("tok", d)).toBe("pending");
    expect(d.getPaymentStatus).not.toHaveBeenCalled();
    expect(d.markPayment).not.toHaveBeenCalled();
  });
  it("REQ-933: cron: una pendiente consultada hace 5 min no se consulta", async () => {
    const confirm = vi.fn(async () => "pending" as const);
    await retryPendingPayments({ listPending: async () => [row({ paymentCheckedAt: "2026-11-04T11:55:00Z" })], confirm, expire: vi.fn(), now });
    expect(confirm).not.toHaveBeenCalled();
  });
});

const n2 = new Date("2026-11-05T12:30:00Z"); // sesión vencida a las 12:00 (dentro de la gracia de 60 min)

describe("REQ-931 resumePayment (el cliente vuelve)", () => {
  const base = () => ({
    load: vi.fn(async () => row()),
    getPaymentStatus: vi.fn(async (): Promise<{ paymentStatus: number }> => { throw new GatewayError("unpaid", 400, 63); }),
    markPayment: vi.fn(async () => {}),
    sendConfirmation: vi.fn(async () => {}),
    createPayment: vi.fn(async () => ({ paymentUrl: "https://checkout.stripe.com/new", checkoutSessionId: "cs_2", expiresAt: "2026-11-06T12:30:00Z" })),
    savePayment: vi.fn(async () => {}),
    expire: vi.fn(async () => "canceled" as const),
    siteUrl: "https://travelpuzzle.com.mx",
    now: n2,
  });
  it("REQ-931: sesión vigente → mismo enlace, sin crear otra", async () => {
    const d = { ...base(), now };
    expect(await resumePayment("tok", d)).toEqual({ kind: "pay", url: "https://checkout.stripe.com/old" });
    expect(d.createPayment).not.toHaveBeenCalled();
  });
  it("REQ-931: vencida dentro de la gracia y sin pagar → POST /payment nuevo, se guarda y se redirige", async () => {
    const d = base();
    expect(await resumePayment("tok", d)).toEqual({ kind: "pay", url: "https://checkout.stripe.com/new" });
    expect(d.createPayment).toHaveBeenCalledWith({ refNumber: "TP1", successUrl: "https://travelpuzzle.com.mx/reserva/tok/pago/exito", cancelUrl: "https://travelpuzzle.com.mx/reserva/tok/pago/cancelado" });
    expect(d.savePayment).toHaveBeenCalledWith("TP1", { checkoutSessionId: "cs_2", paymentUrl: "https://checkout.stripe.com/new", paymentStatus: "pending", paymentExpiresAt: "2026-11-06T12:30:00Z" });
  });
  it("REQ-931: vencida pero pagó en el último momento → pagada, no se regenera", async () => {
    const d = { ...base(), getPaymentStatus: vi.fn(async () => ({ paymentStatus: 1 })) };
    expect(await resumePayment("tok", d)).toEqual({ kind: "paid" });
    expect(d.createPayment).not.toHaveBeenCalled();
  });
  it("REQ-932: vencida pasada la gracia → se cancela (no se regenera)", async () => {
    const d = { ...base(), now: new Date("2026-11-05T14:00:00Z") };
    expect(await resumePayment("tok", d)).toEqual({ kind: "canceled" });
    expect(d.expire).toHaveBeenCalledTimes(1);
    expect(d.createPayment).not.toHaveBeenCalled();
  });
  it("REQ-931: ya pagada o ya cancelada → no se cobra de nuevo", async () => {
    expect(await resumePayment("tok", { ...base(), load: vi.fn(async () => row({ paymentStatus: "paid" })) })).toEqual({ kind: "paid" });
    expect(await resumePayment("tok", { ...base(), load: vi.fn(async () => row({ paymentStatus: "expired", status: "canceled" })) })).toEqual({ kind: "canceled" });
  });
  it("REQ-931: si FREETOUR no da enlace nuevo → error (WhatsApp), sin redirigir a uno vencido", async () => {
    const d = { ...base(), createPayment: vi.fn(async () => { throw new GatewayError("x", 400, 60); }) };
    expect(await resumePayment("tok", d)).toEqual({ kind: "error" });
  });
});

describe("REQ-932 expirePayment (no se pagó)", () => {
  const deps = () => ({
    getPaymentStatus: vi.fn(async (): Promise<{ paymentStatus: number }> => { throw new GatewayError("unpaid", 400, 63); }),
    markPayment: vi.fn(async () => {}),
    sendConfirmation: vi.fn(async () => {}),
    cancel: vi.fn(async () => ({ refNumber: "TP1" })),
    notifyExpired: vi.fn(async () => {}),
    requestManual: vi.fn(async () => {}),
    now: n2,
  });
  it("REQ-932: sin pagar → POST cancel con los 4 campos, se marca vencida y se avisa al cliente", async () => {
    const d = deps();
    expect(await expirePayment(row(), d)).toBe("canceled");
    expect(d.cancel).toHaveBeenCalledWith({ refNumber: "TP1", eventId: 77, adults: 2, children: 0 });
    expect(d.markPayment).toHaveBeenCalledWith("TP1", "expired", n2);
    expect(d.notifyExpired).toHaveBeenCalledWith("TP1");
    expect(d.requestManual).not.toHaveBeenCalled();
  });
  it("REQ-932: la última consulta dice pagada → se confirma y NO se cancela", async () => {
    const d = { ...deps(), getPaymentStatus: vi.fn(async () => ({ paymentStatus: 1 })) };
    expect(await expirePayment(row(), d)).toBe("paid");
    expect(d.cancel).not.toHaveBeenCalled();
    expect(d.sendConfirmation).toHaveBeenCalledWith("TP1");
  });
  it("REQ-932: FREETOUR ya la tenía cancelada (38/39) → se marca, se avisa y no se pide nada al equipo", async () => {
    const d = { ...deps(), getPaymentStatus: vi.fn(async (): Promise<{ paymentStatus: number }> => { throw new GatewayError("canceled", 400, 38); }) };
    expect(await expirePayment(row(), d)).toBe("canceled");
    expect(d.cancel).not.toHaveBeenCalled();
    expect(d.notifyExpired).toHaveBeenCalledWith("TP1");
  });
  it("REQ-932: si FREETOUR no acepta cancelar → el equipo lo hace a mano (REQ-017) y no se avisa todavía al cliente", async () => {
    const d = { ...deps(), cancel: vi.fn(async () => { throw new GatewayError("x", 500, null); }) };
    expect(await expirePayment(row(), d)).toBe("manual");
    expect(d.requestManual).toHaveBeenCalledWith("TP1");
    expect(d.markPayment).toHaveBeenCalledWith("TP1", "expired_manual", n2);
    expect(d.notifyExpired).not.toHaveBeenCalled();
  });
  it("REQ-932: ya rechazada o cancelada (webhook A3) → solo se cierra el pago, sin cancelar ni otro correo", async () => {
    const d = deps();
    expect(await expirePayment(row({ status: "rejected" }), d)).toBe("canceled");
    expect(d.cancel).not.toHaveBeenCalled();
    expect(d.getPaymentStatus).not.toHaveBeenCalled();
    expect(d.notifyExpired).not.toHaveBeenCalled();
    // el estado «rejected» de la reserva se conserva (markPayment con «rejected» no cambia el status)
    expect(d.markPayment).toHaveBeenCalledWith("TP1", "rejected", n2);
  });
  it("REQ-932: en la gracia la consulta es «review» (60/62/64) → no se cancela a ciegas, pasa al equipo", async () => {
    const d = { ...deps(), getPaymentStatus: vi.fn(async (): Promise<{ paymentStatus: number }> => { throw new GatewayError("x", 400, 62); }) };
    expect(await expirePayment(row(), d)).toBe("manual");
    expect(d.cancel).not.toHaveBeenCalled();
  });
});

describe("REQ-932 retryPendingPayments con sesión vencida", () => {
  it("REQ-932: en la gracia consulta (cada 10 min); pasada la gracia cancela", async () => {
    const rows = [row({ refNumber: "G", paymentExpiresAt: "2026-11-05T12:00:00Z" }), row({ refNumber: "X", paymentExpiresAt: "2026-11-05T10:00:00Z" })];
    const confirm = vi.fn(async () => "pending" as const);
    const expire = vi.fn(async () => {});
    const out = await retryPendingPayments({ listPending: async () => rows, confirm, expire, now: n2 });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(expire).toHaveBeenCalledWith(expect.objectContaining({ refNumber: "X" }), n2);
    expect(out).toEqual({ checked: 1, expired: 1 });
  });
});
