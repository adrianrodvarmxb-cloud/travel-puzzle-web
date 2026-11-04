import { describe, expect, it } from "vitest";
import { paymentOutcome, shouldRetry } from "./payment-state";

const now = new Date("2026-11-04T12:00:00Z");
const expires = "2026-11-05T12:00:00Z";

describe("paymentOutcome", () => {
  it("REQ-012: paymentStatus 1 = pagado", () => {
    expect(paymentOutcome({ paymentStatus: 1 })).toBe("paid");
  });
  it("REQ-012: error 63 (aún sin pagar) = pendiente", () => {
    expect(paymentOutcome({ errorCode: 63 })).toBe("pending");
  });
  it("REQ-012: errores 38/39 = reserva cancelada o rechazada; 61 = ya pagado", () => {
    expect(paymentOutcome({ errorCode: 38 })).toBe("canceled");
    expect(paymentOutcome({ errorCode: 39 })).toBe("canceled");
    expect(paymentOutcome({ errorCode: 61 })).toBe("paid");
  });
  it("REQ-012: 60/62/64 u otro = revisar a mano", () => {
    for (const c of [60, 62, 64, 99]) expect(paymentOutcome({ errorCode: c })).toBe("review");
  });
});

describe("shouldRetry", () => {
  it("REQ-012: pendiente y sin vencer: reintenta si pasaron 10 min desde el último intento", () => {
    expect(shouldRetry({ outcome: "pending", expiresAt: expires, lastCheckAt: "2026-11-04T11:49:00Z" }, now)).toBe(true);
    expect(shouldRetry({ outcome: "pending", expiresAt: expires, lastCheckAt: "2026-11-04T11:55:00Z" }, now)).toBe(false);
  });
  it("REQ-012: vencida la sesión o en estado final: no reintenta", () => {
    expect(shouldRetry({ outcome: "pending", expiresAt: "2026-11-04T11:00:00Z", lastCheckAt: null }, now)).toBe(false);
    expect(shouldRetry({ outcome: "paid", expiresAt: expires, lastCheckAt: null }, now)).toBe(false);
  });
});
