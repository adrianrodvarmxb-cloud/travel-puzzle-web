import { describe, expect, it, vi } from "vitest";
import { confirmPayment, retryPendingPayments, startPayment, type PaymentRow } from "./payment";
import { GatewayError } from "./gateway-client";

const now = new Date("2026-11-04T12:00:00Z");
const row = (p: Partial<PaymentRow> = {}): PaymentRow => ({ refNumber: "TP1", manageToken: "tok", checkoutSessionId: "cs_1", paymentStatus: "pending", paymentExpiresAt: "2026-11-05T12:00:00Z", paymentCheckedAt: null, ...p });

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
    expect(expire).toHaveBeenCalledWith("C", now);
    expect(out).toEqual({ checked: 1, expired: 1 });
  });
});
