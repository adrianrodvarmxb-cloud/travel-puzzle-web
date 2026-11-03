import { describe, it, expect } from "vitest";
import { buildRequestCustomerEmail, buildRequestTeamEmail, type RequestSummary } from "./request-email";

const s: RequestSummary = {
  ref: "SOL-20261103-AB12", tripTitle: "Oaxaca: clase de cocina", tripCode: "TP-MX-E01-007", tripUrl: "https://travelpuzzle.com.mx/viajes/mexico/x",
  kind: "reserva", when: "2027-03-05 · 09:00", option: "En grupo", pax: "2 adultos, 1 niño (7)", estimate: "MXN $2,600",
  name: "Ana Pérez", email: "ana@example.com", phone: "+52 55 1234 5678", hotel: "", comments: "Vegetariana <b>",
  logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png", whatsapp: "525536490320", adminUrl: "https://travelpuzzle.com.mx/admin/solicitudes",
};

describe("correos de solicitud", () => {
  it("al cliente: asunto del documento 2024, folio y 'en breve un agente'", () => {
    const e = buildRequestCustomerEmail(s, "es");
    expect(e.subject).toBe("Travel Puzzle / Solicitud de cotización");
    expect(e.html).toContain("SOL-20261103-AB12");
    expect(e.text).toMatch(/En breve un agente se comunicará/);
    expect(e.html).not.toMatch(/freetour/i);
    expect(e.html).toContain("Vegetariana &lt;b&gt;");
  });
  it("en inglés si el cliente navegaba en inglés", () => {
    expect(buildRequestCustomerEmail(s, "en").subject).toBe("Travel Puzzle / Quote request");
  });
  it("al equipo: todos los datos y enlace al panel", () => {
    const e = buildRequestTeamEmail(s);
    expect(e.subject).toContain("SOL-20261103-AB12");
    expect(e.text).toContain("ana@example.com");
    expect(e.text).toContain("https://travelpuzzle.com.mx/admin/solicitudes");
  });
});
