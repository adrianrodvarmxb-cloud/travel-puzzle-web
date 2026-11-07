import { describe, expect, it } from "vitest";
import { formAllowed } from "./route-gate";

describe("qué formulario acepta /api/contacto", () => {
  it("REQ-252: cada formulario solo con su bandera", () => {
    expect(formAllowed("contacto", { nosotros: false, contacto: true, expertos: false })).toBe(true);
    expect(formAllowed("asesor", { nosotros: false, contacto: true, expertos: false })).toBe(false);
    expect(formAllowed("asesor", { nosotros: false, contacto: false, expertos: true })).toBe(true);
    expect(formAllowed("contacto", { nosotros: false, contacto: false, expertos: true })).toBe(false);
  });
});
