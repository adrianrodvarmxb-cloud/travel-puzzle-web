import { describe, expect, it } from "vitest";
import { buildManualCancelTeamEmail } from "./manual-cancel-email";

const LOGO = "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png";
const base = {
  refNumber: "6782-1", eventId: 99, eventDate: "2026-11-12 08:00", adults: 2, children: 1,
  firstName: "Ana", lastName: "<b>Pérez</b>", email: "ana@example.com", logoUrl: LOGO,
};

describe("Aviso al equipo: cancelación por hacer a mano (REQ-017)", () => {
  it("REQ-302: lleva el logo de Travel Puzzle en el encabezado, como los demás correos", () => {
    const m = buildManualCancelTeamEmail({ ...base, detail: { status: 422, message: "too late" } });
    expect(m.html).toContain(`src="${LOGO}"`);
    expect(m.subject).toBe("Cancelación por hacer a mano – 6782-1");
  });

  it("REQ-302: conserva los datos del aviso y escapa lo que escribe el cliente", () => {
    const m = buildManualCancelTeamEmail({ ...base, detail: { status: 422, message: "too late" } });
    expect(m.html).toContain("&lt;b&gt;Pérez&lt;/b&gt;");
    expect(m.html).not.toContain("<b>Pérez</b>");
    expect(m.text).toContain("Freetour no lo aceptó por API (422 too late)");
    expect(m.text).toContain("Personas: 2 adultos, 1 niños");
    expect(m.text).toContain("Cliente: Ana <b>Pérez</b> <ana@example.com>");
  });

  it("REQ-302: sin detalle del proveedor lo dice", () => {
    expect(buildManualCancelTeamEmail({ ...base, detail: null }).text).toContain("(sin detalle)");
  });
});
