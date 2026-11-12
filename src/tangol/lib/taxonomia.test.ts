import { describe, expect, it } from "vitest";
import { CATEGORIA_TANGOL_SIN_TIPO, CODIGOS_TANGOL, categoriaIdDeTangol } from "./taxonomia";
import { DEFAULT_MAPPINGS } from "@/taxonomy/data";

describe("REQ-3465 de un tour de Tangol a la categoría del mapeo", () => {
  it("REQ-3465: sin TypeCode ni SubTypeCode usables, el tour va a la categoría comodín del mapeo", () => {
    for (const tour of [{}, { typeCode: null, subTypeCode: null }, { typeCode: "  ", subTypeCode: "" }]) {
      expect(categoriaIdDeTangol(tour)).toBe(CATEGORIA_TANGOL_SIN_TIPO);
    }
  });

  it("REQ-3465: un TypeCode que Tangol todavía no confirma también va al comodín (nunca se inventa categoría)", () => {
    expect(CODIGOS_TANGOL).toEqual({});
    expect(categoriaIdDeTangol({ typeCode: "EXC", subTypeCode: "FD" })).toBe(CATEGORIA_TANGOL_SIN_TIPO);
  });

  it("REQ-3465: cuando el código esté confirmado, manda la tabla (TypeCode antes que SubTypeCode, sin importar espacios ni mayúsculas)", () => {
    const codigos = { TRF: 9_000_002, SHOW: 9_000_003 };
    expect(categoriaIdDeTangol({ typeCode: " trf " }, codigos)).toBe(9_000_002);
    expect(categoriaIdDeTangol({ typeCode: "XXX", subTypeCode: "show" }, codigos)).toBe(9_000_003);
    expect(categoriaIdDeTangol({ typeCode: "TRF", subTypeCode: "SHOW" }, codigos)).toBe(9_000_002);
  });

  it("REQ-3465: el id que devuelve existe como categoría en el mapeo de Tangol y es entero (Tour.categoryId es Int)", () => {
    const id = categoriaIdDeTangol({});
    expect(Number.isInteger(id)).toBe(true);
    expect(DEFAULT_MAPPINGS.tangol.categorias.map((c) => c.id)).toContain(String(id));
  });

  it("REQ-3465: el rango reservado de Tangol no choca con los ids de FREETOUR (1–35)", () => {
    const freetour = DEFAULT_MAPPINGS.freetour.categorias.map((c) => Number(c.id));
    expect(Math.max(...freetour)).toBeLessThan(9_000_000);
    for (const c of DEFAULT_MAPPINGS.tangol.categorias) expect(Number(c.id)).toBeGreaterThan(9_000_000);
  });
});
