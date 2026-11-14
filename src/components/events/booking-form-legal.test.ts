import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("REQ-1627: el aviso legal del formulario de reserva va en el idioma del formulario", () => {
  it("REQ-1627: el formulario está escrito en español, así que su aviso legal se pide en español (no con el idioma del navegador)", () => {
    const src = readFileSync("src/components/events/EventBookingForm.tsx", "utf8");
    expect(src).toContain('label="Nombre"');
    expect(src).toMatch(/<PrivacyFormNotice lang="es" \/>/);
  });
  it("REQ-1626: el selector de personas usa peopleLabel (sin «1 personas»)", () => {
    const src = readFileSync("src/components/events/PeopleSelector.tsx", "utf8");
    expect(src).not.toMatch(/\{num\} personas|\$\{value\} personas/);
    expect(src).toContain("peopleLabel(");
  });
});
