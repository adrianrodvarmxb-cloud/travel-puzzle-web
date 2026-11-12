import { describe, it, expect } from "vitest";
import { buildCancelCustomerEmail, buildTicketEmail } from "./ticket-email";

const info = { ref: "SOL-20261112-AB12", title: "Bus turístico en Nueva York", date: "2026-12-01", pax: "2 Adult", firstName: "Ana", logoUrl: "https://x.test/logo.png" };

describe("correo del boleto", () => {
  it("REQ-3420: lleva el código, el PDF y la referencia del operador debajo de cada código", () => {
    const m = buildTicketEmail(info, { supplierReference: "BB-K3RM568F", items: [{ kind: "voucher", qr: "BB-K3RM568F", pdfUrl: "https://example.test/v.pdf" }] });
    expect(m.subject).toBe("Travel Puzzle / Tu boleto · SOL-20261112-AB12");
    expect(m.html).toContain("https://example.test/v.pdf");
    expect(m.html).toContain("Ref. BB-K3RM568F");
    expect(m.text).toContain("Código: BB-K3RM568F (Ref. BB-K3RM568F) · PDF: https://example.test/v.pdf");
  });

  it("REQ-3420: un boleto por persona cuando el método es TICKET", () => {
    const m = buildTicketEmail(info, { supplierReference: "R", items: [{ kind: "ticket", qr: "T-1", pdfUrl: null }, { kind: "ticket", qr: "T-2", pdfUrl: null }] });
    expect(m.text).toContain("Boleto 1: T-1");
    expect(m.text).toContain("Boleto 2: T-2");
  });

  it("REQ-3420: escapa lo que viene de fuera", () => {
    const m = buildTicketEmail({ ...info, title: "<script>x</script>" }, { supplierReference: null, items: [] });
    expect(m.html).not.toContain("<script>x</script>");
  });

  it("REQ-3421: la cancelación no promete monto ni plazo de reembolso", () => {
    const m = buildCancelCustomerEmail(info);
    expect(m.text).toContain("Te escribiremos con el detalle del reembolso");
    expect(m.text).not.toMatch(/\d+ ?(días|%)/);
  });
});
