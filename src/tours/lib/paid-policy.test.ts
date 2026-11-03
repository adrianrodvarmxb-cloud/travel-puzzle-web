import { describe, it, expect } from "vitest";
import { paidPolicy } from "./paid-policy";

describe("política de tours con costo (como Freetour)", () => {
  it("pago parcial: depósito hoy y el resto en el punto de encuentro", () => {
    const p = paidPolicy({ fullPrice: 50, payNow: 10, isPartiallyPaid: true, currency: "EUR" }, "es");
    expect(p.payment).toBe("Hoy pagas un depósito de EUR 10; el resto, EUR 40, se paga en el punto de encuentro.");
    expect(p.cancel).toBe("Si no puedes ir, cancela desde el enlace de tu correo de confirmación.");
    expect(p.noShow).toBe("El depósito no es reembolsable si cancelas o no te presentas.");
  });
  it("pago completo al reservar", () => {
    const p = paidPolicy({ fullPrice: 30, payNow: 30, isPartiallyPaid: false, currency: "EUR" }, "es");
    expect(p.payment).toBe("Pagas EUR 30 al reservar.");
    expect(p.noShow).toBe("El pago no es reembolsable si cancelas o no te presentas.");
  });
  it("sin precio conocido: solo la regla general", () => {
    const p = paidPolicy(null, "es");
    expect(p.payment).toBeNull();
    expect(p.noShow).toBe("Lo que pagues al reservar no es reembolsable si cancelas o no te presentas.");
  });
  it("en inglés", () => {
    expect(paidPolicy({ fullPrice: 50, payNow: 10, isPartiallyPaid: true, currency: "EUR" }, "en").payment).toBe("Today you pay a EUR 10 deposit; the rest, EUR 40, is paid at the meeting point.");
  });
});
