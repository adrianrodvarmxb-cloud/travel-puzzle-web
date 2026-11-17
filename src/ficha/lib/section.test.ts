// REQ-10781: decisión 1, sección por tipo de producto.
import { describe, expect, it } from "vitest";
import { sectionFor } from "./section";

describe("REQ-10781: Experiencias o Traslados", () => {
  it("REQ-10781: transporte y traslado (Big Bus, Kiwitaxi, traslados de agencia) van a Traslados; lo demás a Experiencias", () => {
    expect(sectionFor("transporte")).toBe("traslados");
    expect(sectionFor("traslado")).toBe("traslados");
    expect(sectionFor(" Transporte ")).toBe("traslados");
    for (const f of ["free-tour", "visita-guiada", "excursion-de-un-dia", "circuito", "boletos-y-entradas", "a-la-medida", null, undefined, ""]) expect(sectionFor(f)).toBe("experiencias");
  });
});
