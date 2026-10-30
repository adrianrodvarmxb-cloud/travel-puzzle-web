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
});
