import { describe, expect, it } from "vitest";
import { buildPaidCustomerEmail, buildPaidTeamEmail, buildPaymentLinkEmail, type PayMailInput } from "./email";

const LOGO = "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png";
const info: PayMailInput = { ref: "TP-0001", tripTitle: "Lima <virreinal>", firstName: "Ana", kind: "anticipo", centavos: 150000, logoUrl: LOGO };

describe("Correos de pago con el encabezado de Travel Puzzle", () => {
  it.each([
    ["enlace de pago", buildPaymentLinkEmail(info, "https://checkout.stripe.com/x").html],
    ["pago recibido (cliente)", buildPaidCustomerEmail(info).html],
    ["pago recibido (equipo)", buildPaidTeamEmail(info, "https://travelpuzzle.com.mx/admin/solicitudes").html],
  ])("REQ-302: %s lleva el logo de Travel Puzzle en el encabezado", (_n, html) => {
    expect(html).toContain(`src="${LOGO}"`);
    expect(html).toMatch(/^<!doctype html>/);
  });

  it("REQ-302: el aviso al equipo escapa el texto y conserva folio, monto y panel", () => {
    const m = buildPaidTeamEmail(info, "https://travelpuzzle.com.mx/admin/solicitudes");
    expect(m.html).toContain("Lima &lt;virreinal&gt;");
    expect(m.html).not.toContain("Lima <virreinal>");
    expect(m.text).toContain("Folio: TP-0001");
    expect(m.text).toContain("Panel: https://travelpuzzle.com.mx/admin/solicitudes");
    expect(m.html).toContain("Aviso interno");
  });
});
