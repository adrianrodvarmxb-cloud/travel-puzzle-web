import { describe, it, expect } from "vitest";
import { verifyStripeSignature, parsePaymentEvent } from "./webhook";

const secret = "whsec_test_123";
async function sign(payload: string, t: number, key = secret) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${payload}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("verifyStripeSignature", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = 1800000000;

  it("REQ-117: firma correcta y reciente se acepta", async () => {
    const header = `t=${now},v1=${await sign(payload, now)}`;
    expect(await verifyStripeSignature(payload, header, secret, now)).toBe(true);
  });
  it("REQ-117: acepta si alguna de varias v1 coincide (rotación de secreto)", async () => {
    const header = `t=${now},v1=${"0".repeat(64)},v1=${await sign(payload, now)}`;
    expect(await verifyStripeSignature(payload, header, secret, now)).toBe(true);
  });
  it("REQ-117: firma con otro secreto se rechaza", async () => {
    const header = `t=${now},v1=${await sign(payload, now, "whsec_otro")}`;
    expect(await verifyStripeSignature(payload, header, secret, now)).toBe(false);
  });
  it("REQ-117: cuerpo alterado se rechaza", async () => {
    const header = `t=${now},v1=${await sign(payload, now)}`;
    expect(await verifyStripeSignature(payload + " ", header, secret, now)).toBe(false);
  });
  it("REQ-117: más de 5 min de diferencia se rechaza (repetición)", async () => {
    const old = now - 301;
    const header = `t=${old},v1=${await sign(payload, old)}`;
    expect(await verifyStripeSignature(payload, header, secret, now)).toBe(false);
  });
  it("REQ-117: encabezado vacío, mal formado o sin secreto se rechaza", async () => {
    expect(await verifyStripeSignature(payload, null, secret, now)).toBe(false);
    expect(await verifyStripeSignature(payload, "basura", secret, now)).toBe(false);
    expect(await verifyStripeSignature(payload, `t=${now},v1=${await sign(payload, now)}`, "", now)).toBe(false);
  });
});

describe("parsePaymentEvent", () => {
  const session = (over: Record<string, unknown> = {}) => ({
    id: "cs_test_1", payment_status: "paid", amount_total: 190600, currency: "mxn",
    payment_intent: "pi_1", metadata: { payment_id: "pay_1", request_id: "req_1", kind: "anticipo" }, ...over,
  });
  it("REQ-117: sesión completada y pagada → paid", () => {
    expect(parsePaymentEvent({ type: "checkout.session.completed", data: { object: session() } })).toEqual({
      type: "paid", paymentId: "pay_1", sessionId: "cs_test_1", amountCentavos: 190600, paymentIntent: "pi_1",
    });
  });
  it("REQ-117: sesión completada sin pagar todavía → ignore", () => {
    expect(parsePaymentEvent({ type: "checkout.session.completed", data: { object: session({ payment_status: "unpaid" }) } })).toEqual({ type: "ignore" });
  });
  it("REQ-117: sesión vencida → expired", () => {
    expect(parsePaymentEvent({ type: "checkout.session.expired", data: { object: session({ payment_status: "unpaid" }) } })).toEqual({
      type: "expired", paymentId: "pay_1", sessionId: "cs_test_1",
    });
  });
  it("REQ-117: eventos ajenos o sin payment_id → ignore", () => {
    expect(parsePaymentEvent({ type: "charge.refunded", data: { object: {} } })).toEqual({ type: "ignore" });
    expect(parsePaymentEvent({ type: "checkout.session.completed", data: { object: session({ metadata: {} }) } })).toEqual({ type: "ignore" });
    expect(parsePaymentEvent(null)).toEqual({ type: "ignore" });
  });
});
