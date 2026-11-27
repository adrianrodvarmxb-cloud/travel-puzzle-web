import { describe, expect, it } from "vitest";
import { fichaEjemplo } from "./fixtures";
import { whatsappContext, whatsappLink } from "./whatsapp-context";

const ficha = () => {
  const f = fichaEjemplo();
  f.code = "TP-AR-043";
  f.options = [
    { id: "op-1", name: "Con traslado", price: null, transferIncluded: true, startTime: null },
    { id: "op-2", name: "Sin traslado", price: null, transferIncluded: false, startTime: null },
  ];
  return f;
};

describe("REQ-10821: mensaje de WhatsApp desde la ficha (decisión 41: código, fecha, personas y opción)", () => {
  it("REQ-10821: con todo el contexto lleva título, código, fecha, personas y opción, en español", () => {
    const m = whatsappContext(ficha(), { fecha: "2026-12-20", adultos: 2, ninos: 1, opcion: "op-2" });
    expect(m).toBe("Hola Travel Puzzle, me interesa «Tour de ejemplo» (código TP-AR-043). Fecha: 20/12/2026. Personas: 2 adultos y 1 niño. Opción: Sin traslado.");
  });

  it("REQ-10821: en inglés con el mismo contenido", () => {
    const f = ficha();
    f.lang = "en";
    const m = whatsappContext(f, { fecha: "2026-12-20", adultos: 1, ninos: 0, opcion: "op-1" });
    expect(m).toBe("Hi Travel Puzzle, I'm interested in «Tour de ejemplo» (code TP-AR-043). Date: 2026-12-20. People: 1 adult. Option: Con traslado.");
  });

  it("REQ-10821: sin código Travel Puzzle usa la referencia del proveedor; sin contexto solo título y código", () => {
    const f = ficha();
    f.code = null;
    f.externalRef = "43";
    f.provider = "tangol";
    expect(whatsappContext(f, {})).toBe("Hola Travel Puzzle, me interesa «Tour de ejemplo» (código tangol-43).");
  });

  it("REQ-10821: una opción que no existe o una fecha inválida no entran al mensaje", () => {
    const m = whatsappContext(ficha(), { fecha: "2026-13-40", adultos: 3, opcion: "zzz" });
    expect(m).toBe("Hola Travel Puzzle, me interesa «Tour de ejemplo» (código TP-AR-043). Personas: 3 adultos.");
  });

  it("REQ-10821: nunca lleva neto, teléfono del operador ni el nombre del operador", () => {
    const m = whatsappContext(ficha(), { fecha: "2026-12-20", adultos: 2 });
    expect(m).not.toMatch(/Operador de ejemplo|neto|\+?\d{10,}/);
  });

  it("REQ-10821: la liga abre wa.me con el mensaje codificado; sin número no hay liga", () => {
    const l = whatsappLink("+52 1 55 3649 0320", ficha(), { adultos: 2 });
    expect(l).toBe(`https://wa.me/5215536490320?text=${encodeURIComponent("Hola Travel Puzzle, me interesa «Tour de ejemplo» (código TP-AR-043). Personas: 2 adultos.")}`);
    expect(whatsappLink(undefined, ficha(), {})).toBeNull();
  });
});
