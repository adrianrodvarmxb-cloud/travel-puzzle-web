import { describe, expect, it } from "vitest";
import { paymentReturnUrls, resumeRedirect } from "./payment-urls";

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

describe("REQ-931 resumeRedirect", () => {
  it("REQ-931: a dónde va el cliente al volver a pagar", () => {
    expect(resumeRedirect({ kind: "pay", url: "https://checkout.stripe.com/n" }, "tok")).toBe("https://checkout.stripe.com/n");
    expect(resumeRedirect({ kind: "paid" }, "tok")).toBe("/reserva/tok/pago/exito");
    expect(resumeRedirect({ kind: "canceled" }, "tok")).toBe("/reserva/tok/pago/cancelado?estado=vencido");
    expect(resumeRedirect({ kind: "error" }, "tok")).toBe("/reserva/tok/pago/cancelado?estado=error");
    expect(resumeRedirect({ kind: "not_found" }, "a b")).toBe("/reserva/a%20b");
  });
  it("REQ-931: nunca redirige a una URL que no sea https", () => {
    expect(resumeRedirect({ kind: "pay", url: "javascript:alert(1)" }, "tok")).toBe("/reserva/tok/pago/cancelado?estado=error");
  });
});
