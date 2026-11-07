import { describe, it, expect } from "vitest";
import { paidPolicy, isRefundPolicyConfirmed, paidPolicyConfirmed } from "./paid-policy";

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

describe("política confirmada por Freetour (gate B)", () => {
  it("REQ-013: sin texto confirmado por escrito no se puede reservar con pago", () => {
    expect(isRefundPolicyConfirmed(null)).toBe(false);
  });
  it("REQ-013: Elias (Freetour) confirmó por escrito el reembolso automático (hasta 24 h antes y si el operador rechaza); ya hay texto", () => {
    expect(isRefundPolicyConfirmed()).toBe(true);
    for (const l of ["es", "en", "pt", "de", "fr", "it"]) {
      const t = paidPolicyConfirmed(null, l).noShow!;
      expect(t).toMatch(/24/);
      expect(t.length).toBeGreaterThan(40);
    }
    expect(paidPolicyConfirmed(null, "es").noShow).toMatch(/reembolso/);
    expect(paidPolicyConfirmed(null, "es").noShow).toMatch(/operador rechaza/);
    expect(paidPolicyConfirmed(null, "xx").noShow).toBe(paidPolicyConfirmed(null, "en").noShow);
  });
  it("REQ-013: el aviso de reembolso usa el texto confirmado; sin él no se afirma nada sobre reembolsos", () => {
    const p = paidPolicyConfirmed(null, "es", null);
    expect(p.noShow).toBeNull();
    const q = paidPolicyConfirmed(null, "es", { es: "Texto confirmado por Freetour.", en: "Confirmed text." });
    expect(q.noShow).toBe("Texto confirmado por Freetour.");
    expect(paidPolicyConfirmed(null, "en", { es: "x", en: "Confirmed text." }).noShow).toBe("Confirmed text.");
  });
});

// REQ-937 (D4): el cargo es en EUR; si la tarjeta es de otra moneda, la conversión es aproximada y el banco puede cobrar comisión.
describe("REQ-937 nota de cargo en EUR", () => {
  const p = { fullPrice: 40, payNow: 40, isPartiallyPaid: false, currency: "EUR" };
  it("REQ-937: es", () => {
    expect(paidPolicyConfirmed(p, "es").chargeNote).toBe("El cargo se hace en euros (EUR) en una plataforma de pago segura. Si tu tarjeta es en pesos u otra moneda, la conversión es aproximada y tu banco puede cobrar comisión.");
  });
  it("REQ-937: en", () => {
    expect(paidPolicyConfirmed(p, "en").chargeNote).toBe("You are charged in euros (EUR) on a secure payment platform. If your card is in another currency, the conversion is approximate and your bank may charge a fee.");
  });
});
