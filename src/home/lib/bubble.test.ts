import { describe, it, expect } from "vitest";
import { bubbleVisible } from "./bubble";

// REQ-045: en celular la burbuja de WhatsApp no tapa la galería al abrir la ficha
describe("REQ-045 bubbleVisible", () => {
  it("REQ-045: sin umbral siempre se ve (resto del sitio igual que hoy)", () => {
    expect(bubbleVisible({ scrollY: 0, width: 390 })).toBe(true);
  });
  it("REQ-045: en celular con umbral aparece al bajar más allá de la galería", () => {
    expect(bubbleVisible({ scrollY: 0, width: 390, revealAfter: 600 })).toBe(false);
    expect(bubbleVisible({ scrollY: 601, width: 390, revealAfter: 600 })).toBe(true);
  });
  it("REQ-045: en escritorio se ve siempre aunque haya umbral", () => {
    expect(bubbleVisible({ scrollY: 0, width: 1366, revealAfter: 600 })).toBe(true);
  });
});
