import { describe, it, expect } from "vitest";
import { parseRetryAfter, planRetry, canCheckPaymentStatus, MAX_FAILURES, PAYMENT_STATUS_MIN_INTERVAL_MS } from "./retry";

const now = new Date("2026-11-05T09:00:00Z");
const plus = (ms: number) => new Date(now.getTime() + ms);

describe("parseRetryAfter", () => {
  it("REQ-077: acepta segundos y fecha HTTP; ignora lo inválido", () => {
    expect(parseRetryAfter("120", now)).toBe(120_000);
    expect(parseRetryAfter("Thu, 05 Nov 2026 09:05:00 GMT", now)).toBe(300_000);
    expect(parseRetryAfter("Thu, 05 Nov 2026 08:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter("pronto", now)).toBeNull();
  });
});

describe("planRetry", () => {
  it("REQ-077: un 429 espera lo que diga Retry-After (mínimo 1 minuto)", () => {
    expect(planRetry({ status: 429, retryAfter: "300", login: false, failures: 0, now })).toEqual({ action: "wait", notBefore: plus(300_000) });
    expect(planRetry({ status: 429, retryAfter: "5", login: false, failures: 0, now })).toEqual({ action: "wait", notBefore: plus(60_000) });
    expect(planRetry({ status: 429, retryAfter: null, login: false, failures: 0, now })).toEqual({ action: "wait", notBefore: plus(60_000) });
  });

  it("REQ-077: un login rechazado no se reintenta (aborta la corrida para no bloquear la cuenta)", () => {
    expect(planRetry({ status: 401, retryAfter: null, login: true, failures: 0, now })).toEqual({ action: "abort", reason: "login" });
    expect(planRetry({ status: 400, retryAfter: null, login: true, failures: 0, now })).toEqual({ action: "abort", reason: "login" });
  });

  it("REQ-077: un 500 espera de forma exponencial y aborta al llegar al máximo de fallos", () => {
    expect(planRetry({ status: 500, retryAfter: null, login: false, failures: 0, now })).toEqual({ action: "wait", notBefore: plus(60_000) });
    expect(planRetry({ status: 503, retryAfter: null, login: false, failures: 2, now })).toEqual({ action: "wait", notBefore: plus(240_000) });
    expect(planRetry({ status: 0, retryAfter: null, login: true, failures: 1, now })).toEqual({ action: "wait", notBefore: plus(120_000) });
    expect(planRetry({ status: 500, retryAfter: null, login: false, failures: MAX_FAILURES - 1, now })).toEqual({ action: "abort", reason: "error" });
  });

  it("REQ-077: otros 4xx no se reintentan", () => {
    expect(planRetry({ status: 404, retryAfter: null, login: false, failures: 0, now })).toEqual({ action: "abort", reason: "http-404" });
  });
});

describe("canCheckPaymentStatus", () => {
  it("REQ-077: con error 63 solo se vuelve a consultar tras 10 minutos", () => {
    expect(PAYMENT_STATUS_MIN_INTERVAL_MS).toBe(600_000);
    expect(canCheckPaymentStatus({ lastErrorCode: 63, lastAttemptAt: new Date(now.getTime() - 599_000), now })).toBe(false);
    expect(canCheckPaymentStatus({ lastErrorCode: 63, lastAttemptAt: new Date(now.getTime() - 600_000), now })).toBe(true);
  });

  it("REQ-077: sin error 63 o sin intento previo se puede consultar", () => {
    expect(canCheckPaymentStatus({ lastErrorCode: null, lastAttemptAt: now, now })).toBe(true);
    expect(canCheckPaymentStatus({ lastErrorCode: 63, lastAttemptAt: null, now })).toBe(true);
  });
});
