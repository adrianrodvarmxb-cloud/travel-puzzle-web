import { describe, expect, it } from "vitest";
import { CATEGORIA_TANGOL_SIN_TIPO, CODIGOS_TANGOL, categoriaIdDeTangol, claveTangol } from "./taxonomia";
import { DEFAULT_MAPPINGS } from "@/taxonomy/data";

/** REQ-3502 (reemplaza a REQ-3465, que usaba una sola categoría comodín): el par TypeCode|SubTypeCode real decide la categoría. */
describe("REQ-3502 de un tour de Tangol a la categoría del mapeo", () => {
  it("REQ-3502: la clave es TypeCode|SubTypeCode, sin importar espacios ni mayúsculas", () => {
    expect(claveTangol({ typeCode: " traslado ", subTypeCode: "in/out " })).toBe("TRASLADO|IN/OUT");
    expect(claveTangol({ typeCode: "EXCURSION", subTypeCode: "EN TREN" })).toBe("EXCURSION|EN TREN");
    expect(claveTangol({})).toBe("|");
  });

  it("REQ-3502: un par conocido va a su categoría propia, no a la red de seguridad", () => {
    expect(categoriaIdDeTangol({ typeCode: "TRASLADO", subTypeCode: "IN" })).toBe(CODIGOS_TANGOL["TRASLADO|IN"]);
    expect(categoriaIdDeTangol({ typeCode: "show", subTypeCode: "tango" })).toBe(CODIGOS_TANGOL["SHOW|TANGO"]);
    expect(categoriaIdDeTangol({ typeCode: "TRASLADO", subTypeCode: "IN" })).not.toBe(CATEGORIA_TANGOL_SIN_TIPO);
  });

  it("REQ-3502: sin códigos, o con un par que no está en la tabla, va a la red de seguridad (nunca se inventa categoría)", () => {
    for (const tour of [{}, { typeCode: null, subTypeCode: null }, { typeCode: "  ", subTypeCode: "" }, { typeCode: "EXCURSION", subTypeCode: "NUEVO" }, { typeCode: "TRASLADO" }]) {
      expect(categoriaIdDeTangol(tour)).toBe(CATEGORIA_TANGOL_SIN_TIPO);
    }
  });

  it("REQ-3502: la tabla se puede pasar por parámetro", () => {
    expect(categoriaIdDeTangol({ typeCode: "x", subTypeCode: "y" }, { "X|Y": 9_000_999 })).toBe(9_000_999);
  });

  it("REQ-3502: cada id de la tabla y el de la red existen en el mapeo de Tangol y son enteros (Tour.categoryId es Int)", () => {
    const ids = DEFAULT_MAPPINGS.tangol.categorias.map((c) => c.id);
    for (const id of [CATEGORIA_TANGOL_SIN_TIPO, ...Object.values(CODIGOS_TANGOL)]) {
      expect(Number.isInteger(id)).toBe(true);
      expect(ids).toContain(String(id));
    }
  });

  it("REQ-3502: el rango reservado de Tangol no choca con los ids de FREETOUR (1–35)", () => {
    const freetour = DEFAULT_MAPPINGS.freetour.categorias.map((c) => Number(c.id));
    expect(Math.max(...freetour)).toBeLessThan(9_000_000);
    for (const c of DEFAULT_MAPPINGS.tangol.categorias) expect(Number(c.id)).toBeGreaterThan(9_000_000);
  });
});
