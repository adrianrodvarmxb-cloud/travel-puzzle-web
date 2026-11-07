import { describe, it, expect, vi } from "vitest";
import { createGatewayClient, GatewayError } from "./gateway-client";
import { signRequest } from "./lib/signature";

const now = () => 1800000000000;

function fetchReturning(status: number, json: unknown) {
  return vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(json), { status }));
}

describe("cliente de la pasarela", () => {
  it("manda la operación firmada a /freetour y devuelve data", async () => {
    const fetch = fetchReturning(200, { status: 200, data: { refNumber: "R1", status: "confirmed" } });
    const gw = createGatewayClient({ url: "https://travelpuzzle.com.mx/pasarela/", secret: "s", fetch, now });
    const out = await gw.getBooking("R1");
    expect(out).toEqual({ refNumber: "R1", status: "confirmed" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://travelpuzzle.com.mx/pasarela/freetour");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-tp-timestamp"]).toBe("1800000000000");
    expect(headers["x-tp-signature"]).toBe(await signRequest("s", "1800000000000", init.body as string));
    expect(JSON.parse(init.body as string)).toEqual({ op: "getBooking", payload: { refNumber: "R1" } });
  });

  it("si Freetour responde error, lanza GatewayError con su código", async () => {
    const fetch = fetchReturning(500, { status: 500, data: { errorMessage: "Internal", errorCode: 7 } });
    const gw = createGatewayClient({ url: "https://x.mx/p", secret: "s", fetch, now });
    const err = await gw.createBooking({ eventId: 1, adults: 1, children: 0, price: 0, customer: { email: "a@b.co", firstName: "A", lastName: "B" } }).catch((e) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err).toMatchObject({ status: 500, errorCode: 7 });
  });

  it("sin URL o secreto configurados, falla claro antes de llamar", async () => {
    const fetch = fetchReturning(200, {});
    const gw = createGatewayClient({ url: "", secret: "", fetch, now });
    await expect(gw.getBooking("R1")).rejects.toThrow(/pasarela no configurada/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("corta a los 35 s y lanza un error claro (504)", async () => {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    const gw = createGatewayClient({ url: "https://x.mx/p", secret: "s", fetch, now });
    const err = await gw.getBooking("R1").catch((e) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err).toMatchObject({ status: 504 });
  });

  it("manda el token del intento junto con la reserva", async () => {
    const fetch = fetchReturning(200, { data: { refNumber: "R1" } });
    const gw = createGatewayClient({ url: "https://x.mx/p", secret: "s", fetch, now });
    const p = { eventId: 1, adults: 1, children: 0, price: 0, customer: { email: "a@b.co", firstName: "A", lastName: "B" }, idempotencyKey: "abcdefghijklmnop1234" };
    await gw.createBooking(p);
    expect(JSON.parse(fetch.mock.calls[0][1].body as string).payload.idempotencyKey).toBe("abcdefghijklmnop1234");
  });

  it("REQ-011: createPayment manda refNumber y URLs de regreso y devuelve el checkout", async () => {
    const fetch = fetchReturning(200, { status: 200, data: { paymentUrl: "https://checkout.stripe.com/x", checkoutSessionId: "cs_1", createdAt: "a", expiresAt: "b" } });
    const gw = createGatewayClient({ url: "https://x.mx/p", secret: "s", fetch, now });
    const out = await gw.createPayment({ refNumber: "R1", successUrl: "https://t/ok", cancelUrl: "https://t/no" });
    expect(out.paymentUrl).toBe("https://checkout.stripe.com/x");
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({ op: "createPayment", payload: { refNumber: "R1", successUrl: "https://t/ok", cancelUrl: "https://t/no" } });
  });

  it("REQ-012: getPaymentStatus sin pagar lanza GatewayError 63 (lo traduce payment-state)", async () => {
    const fetch = fetchReturning(400, { status: 400, data: { errorMessage: "Not paid yet", errorCode: 63 } });
    const gw = createGatewayClient({ url: "https://x.mx/p", secret: "s", fetch, now });
    const err = await gw.getPaymentStatus("cs_1").catch((e) => e);
    expect(err).toMatchObject({ errorCode: 63 });
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({ op: "getPaymentStatus", payload: { checkoutSessionId: "cs_1" } });
  });
});

