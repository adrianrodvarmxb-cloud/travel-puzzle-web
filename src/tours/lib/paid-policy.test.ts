import { describe, it, expect } from "vitest";
import { paidPolicy } from "./paid-policy";

// Gate REQ-097 (PO, 5 nov 2026): cancelación gratis con reembolso hasta 24 h antes; después o si no se presenta,
// no hay reembolso. Con depósito o pago a la llegada aplica lo mismo sobre lo pagado.
describe("política de tours con costo (gate REQ-097)", () => {
  it("REQ-097: pago completo: reembolso hasta 24 h antes; después o sin presentarse, sin reembolso", () => {
    const p = paidPolicy({ fullPrice: 30, payNow: 30, isPartiallyPaid: false, currency: "EUR" }, "es");
    expect(p.payment).toBe("Pagas EUR 30 al reservar.");
    expect(p.cancel).toBe("Cancelación gratis con reembolso de lo pagado hasta 24 h antes del tour, desde el enlace de tu correo de confirmación.");
    expect(p.noShow).toBe("Si cancelas con menos de 24 h o no te presentas, no hay reembolso.");
  });

  it("REQ-097: depósito: la misma regla aplica sobre el depósito", () => {
    const p = paidPolicy({ fullPrice: 50, payNow: 10, isPartiallyPaid: true, currency: "EUR" }, "es");
    expect(p.payment).toBe("Hoy pagas un depósito de EUR 10; el resto, EUR 40, se paga en el punto de encuentro.");
    expect(p.cancel).toBe("Cancelación gratis con reembolso del depósito hasta 24 h antes del tour, desde el enlace de tu correo de confirmación.");
    expect(p.noShow).toBe("Si cancelas con menos de 24 h o no te presentas, no hay reembolso.");
  });

  it("REQ-097: pago a la llegada: se indica que se paga en el punto de encuentro y la regla aplica sobre lo pagado", () => {
    const p = paidPolicy({ fullPrice: 25, payNow: 0, isPartiallyPaid: true, currency: "EUR" }, "es");
    expect(p.payment).toBe("Pagas EUR 25 en el punto de encuentro; al reservar no pagas nada.");
    expect(p.cancel).toBe("Cancelación gratis hasta 24 h antes del tour, desde el enlace de tu correo de confirmación.");
    expect(p.noShow).toBe("Si cancelas con menos de 24 h o no te presentas, no hay reembolso de lo pagado.");
  });

  it("REQ-097: sin precio conocido: solo la regla general de 24 h", () => {
    const p = paidPolicy(null, "es");
    expect(p.payment).toBeNull();
    expect(p.cancel).toBe("Cancelación gratis con reembolso de lo pagado hasta 24 h antes del tour, desde el enlace de tu correo de confirmación.");
    expect(p.noShow).toBe("Si cancelas con menos de 24 h o no te presentas, no hay reembolso.");
  });

  it("REQ-097: ya no dice que el pago no es reembolsable en cualquier caso", () => {
    for (const price of [null, { fullPrice: 30, payNow: 30, isPartiallyPaid: false, currency: "EUR" }, { fullPrice: 50, payNow: 10, isPartiallyPaid: true, currency: "EUR" }]) {
      const p = paidPolicy(price, "es");
      expect(`${p.cancel} ${p.noShow}`).not.toMatch(/no es reembolsable si cancelas/);
      expect(p.cancel).toMatch(/24 h/);
    }
  });

  it("REQ-097: en inglés", () => {
    const p = paidPolicy({ fullPrice: 50, payNow: 10, isPartiallyPaid: true, currency: "EUR" }, "en");
    expect(p.payment).toBe("Today you pay a EUR 10 deposit; the rest, EUR 40, is paid at the meeting point.");
    expect(p.cancel).toBe("Free cancellation with a refund of the deposit up to 24 h before the tour, from the link in your confirmation email.");
    expect(p.noShow).toBe("If you cancel less than 24 h before or don't show up, there is no refund.");
  });
});
