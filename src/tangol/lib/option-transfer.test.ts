import { describe, expect, it } from "vitest";
import { transferFromDescription } from "./option-transfer";

describe("Tangol: traslado según la descripción de la opción (ola 12)", () => {
  it("REQ-10883: «con traslado» y sus variantes dan true; «sin traslado» y sus variantes dan false", () => {
    expect(transferFromDescription("Con traslado")).toBe(true);
    expect(transferFromDescription("CON TRASLADOS desde hoteles del centro")).toBe(true);
    expect(transferFromDescription("With transfer")).toBe(true);
    expect(transferFromDescription("With hotel pickup")).toBe(true);
    expect(transferFromDescription("Incluye traslado")).toBe(true);
    expect(transferFromDescription("Sin traslado")).toBe(false);
    expect(transferFromDescription("SIN TRASLADOS - punto de encuentro")).toBe(false);
    expect(transferFromDescription("Without transfer")).toBe(false);
    expect(transferFromDescription("No incluye traslado")).toBe(false);
    expect(transferFromDescription("Without pickup")).toBe(false);
  });

  it("REQ-10883: sin la palabra, o con las dos, no se adivina (null)", () => {
    expect(transferFromDescription("Salida 09:00")).toBeNull();
    expect(transferFromDescription("")).toBeNull();
    expect(transferFromDescription(null)).toBeNull();
    expect(transferFromDescription(undefined)).toBeNull();
    expect(transferFromDescription("Con traslado o sin traslado, a elegir")).toBeNull();
  });
});
