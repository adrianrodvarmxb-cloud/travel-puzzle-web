import { describe, expect, it } from "vitest";
import { paymentReturnUrls } from "./payment-urls";

describe("paymentReturnUrls", () => {
  it("REQ-011: URLs https de éxito y cancelación con el token de la reserva", () => {
    expect(paymentReturnUrls("https://travelpuzzle.com.mx/", "abc123")).toEqual({
      successUrl: "https://travelpuzzle.com.mx/reserva/abc123/pago/exito",
      cancelUrl: "https://travelpuzzle.com.mx/reserva/abc123/pago/cancelado",
    });
  });
  it("REQ-011: sin sitio https no se puede cobrar", () => {
    expect(() => paymentReturnUrls("http://localhost:3000", "abc")).toThrow();
    expect(() => paymentReturnUrls("", "abc")).toThrow();
  });
});
