import { describe, expect, it } from "vitest";
import { PAYMENT_GRACE_MS, canCheckNow, paymentOutcome, sessionAction, shouldRetry } from "./payment-state";

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

// REQ-931 / REQ-932 / REQ-933: sesión de pago vencida y ritmo de consultas (D5).
describe("REQ-931 sessionAction", () => {
  const n = new Date("2026-11-05T12:30:00Z");
  it("REQ-931: sesión vigente → se reutiliza el enlace", () => {
    expect(sessionAction({ expiresAt: "2026-11-05T13:00:00Z", eventUtcDate: "2026-11-09T10:00:00Z" }, n)).toBe("valid");
  });
  it("REQ-931: vencida hace menos de PAYMENT_GRACE_MS y el tour no empezó → se regenera", () => {
    expect(sessionAction({ expiresAt: "2026-11-05T12:00:00Z", eventUtcDate: "2026-11-09T10:00:00Z" }, n)).toBe("regenerate");
  });
  it("REQ-932: vencida y pasada la gracia → se cancela", () => {
    expect(sessionAction({ expiresAt: "2026-11-05T11:00:00Z", eventUtcDate: "2026-11-09T10:00:00Z" }, n)).toBe("cancel");
  });
  it("REQ-932: vencida y el tour ya empezó → se cancela, nunca se regenera", () => {
    expect(sessionAction({ expiresAt: "2026-11-05T12:20:00Z", eventUtcDate: "2026-11-05T12:00:00Z" }, n)).toBe("cancel");
  });
  it("REQ-932: utcDate de FREETOUR sin zona («YYYY-MM-DD HH:mm:ss») se lee como UTC", () => {
    expect(sessionAction({ expiresAt: "2026-11-05T12:20:00Z", eventUtcDate: "2026-11-05 12:00:00" }, n)).toBe("cancel");
  });
  it("REQ-931: sin fecha de vencimiento → vigente", () => {
    expect(sessionAction({ expiresAt: null, eventUtcDate: null }, n)).toBe("valid");
  });
  it("REQ-931: la gracia es de 60 minutos", () => {
    expect(PAYMENT_GRACE_MS).toBe(60 * 60 * 1000);
  });
});

describe("REQ-933 canCheckNow (error 63: máximo una consulta cada 10 min)", () => {
  const n = new Date("2026-11-05T12:30:00Z");
  it("REQ-933: nunca consultada → se puede consultar", () => {
    expect(canCheckNow(null, n)).toBe(true);
  });
  it("REQ-933: consultada hace 9 min → no", () => {
    expect(canCheckNow("2026-11-05T12:21:00Z", n)).toBe(false);
  });
  it("REQ-933: consultada hace 10 min → sí", () => {
    expect(canCheckNow("2026-11-05T12:20:00Z", n)).toBe(true);
  });
});
