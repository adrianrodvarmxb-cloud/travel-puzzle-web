import { describe, it, expect } from "vitest";
import { paidPolicy, isRefundPolicyConfirmed, paidPolicyConfirmed } from "./paid-policy";

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
