import { describe, expect, it } from "vitest";
import { buildHeldCustomerEmail, buildHeldTeamEmail, buildReleasedCustomerEmail, buildReleasedTeamEmail, buildPaidCustomerEmail, buildPaidTeamEmail, buildPaymentLinkEmail, type PayMailInput } from "./email";

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

describe("Correos de retención (REQ-3482)", () => {
  const held: PayMailInput = { ...info, kind: "total" };
  it("REQ-3482: el correo al cliente dice que la tarjeta está retenida, que no se ha cobrado y que se libera si no hay lugar", () => {
    const m = buildHeldCustomerEmail(held);
    expect(m.subject).toContain("TP-0001");
    expect(m.subject).not.toContain("Recibimos tu pago");
    expect(m.text).toContain("retuvimos");
    expect(m.text).toContain("no se cobra");
    expect(m.text).toContain("libera");
    expect(m.text).toContain("MXN $1,500");
    expect(m.html).toContain("Lima &lt;virreinal&gt;");
  });
  it("REQ-3482: el aviso al equipo trae folio, monto y que falta confirmar con el proveedor", () => {
    const m = buildHeldTeamEmail(held, "https://travelpuzzle.com.mx/admin/solicitudes");
    expect(m.subject).toContain("TP-0001");
    expect(m.subject).toContain("retenida");
    expect(m.text).toContain("confirmar con el proveedor");
    expect(m.text).toContain("/admin/solicitudes");
  });
});

describe("Correos de liberación (REQ-3483)", () => {
  const rel: PayMailInput = { ...info, kind: "total" };
  it("REQ-3483: el cliente sabe que su tarjeta quedó libre y que no se le cobró nada", () => {
    const m = buildReleasedCustomerEmail(rel);
    expect(m.subject).toContain("TP-0001");
    expect(m.text).toContain("sin cargo");
    expect(m.text).toContain("MXN $1,500");
  });
  it("REQ-3483: el equipo ve el motivo de la liberación", () => {
    const m = buildReleasedTeamEmail(rel, "https://travelpuzzle.com.mx/admin/solicitudes", "sin lugar");
    expect(m.subject).toContain("liberada");
    expect(m.text).toContain("sin lugar");
  });
});
