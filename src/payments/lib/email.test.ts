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

import { buildPaidCustomerEmail as pagado } from "./email";
describe("REQ-3523: constancia de contratación en el correo de pago (implementa REQ-3388)", () => {
  const base = { ref: "TP-ABC123", tripTitle: "Cusco mágico", firstName: "Ana", kind: "anticipo" as const, centavos: 2600000, logoUrl: "https://x/logo.png" };
  it("REQ-3523: con los datos de la empresa, el correo trae la constancia: agencia con RNT, folio, viaje, fecha, personas, monto y ligas al contrato y al aviso", () => {
    const m = pagado({ ...base, fecha: "2027-04-01", personas: "2 adultos", empresa: "CLAUDIA LETICIA RODRÍGUEZ LAVEAGA, con nombre comercial TRAVEL PUZZLE. Registro Nacional de Turismo No. 04100050179.", siteUrl: "https://travelpuzzle.com.mx" });
    for (const s of ["Constancia de contratación", "Registro Nacional de Turismo No. 04100050179", "TP-ABC123", "Cusco mágico", "2027-04-01", "2 adultos", "MXN $26,000",
      "https://travelpuzzle.com.mx/terminos", "https://travelpuzzle.com.mx/privacidad", "confirmación del prestador final"]) expect(m.text).toContain(s);
    expect(m.html).toContain("Constancia de contratación");
  });
  it("REQ-3523: sin datos de la empresa, el correo queda como antes (LSP)", () => {
    expect(pagado(base).text).not.toContain("Constancia");
  });
});
