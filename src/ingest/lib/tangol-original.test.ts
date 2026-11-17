import { describe, expect, it } from "vitest";
import { originalDeTangol } from "./tangol-original";

// REQ-10729: ficha única, decisión 14 (REQ-10593): la categoría original de Tangol se guarda completa (tipo y subtipo), sin mostrarse.
describe("REQ-10729 categoría original de Tangol completa (decisión 14)", () => {
  it("REQ-10729: con tipo y subtipo guarda los dos, tal cual los mandó Tangol", () => {
    expect(originalDeTangol({ TypeCode: "EXCURSION", SubTypeCode: "Aventura" })).toEqual({
      field: "TypeCode|SubTypeCode", value: "EXCURSION|Aventura",
    });
  });

  it("REQ-10729: sin subtipo guarda solo el tipo, como antes (las filas viejas siguen leyéndose igual)", () => {
    expect(originalDeTangol({ TypeCode: "SIC" })).toEqual({ field: "TypeCode", value: "SIC" });
    expect(originalDeTangol({ TypeCode: "SIC", SubTypeCode: "" })).toEqual({ field: "TypeCode", value: "SIC" });
    expect(originalDeTangol({ TypeCode: "SIC", SubTypeCode: 7 })).toEqual({ field: "TypeCode", value: "SIC" });
  });

  it("REQ-10729: sin tipo no hay categoría original, aunque venga subtipo", () => {
    expect(originalDeTangol({ SubTypeCode: "REG" })).toBeNull();
    expect(originalDeTangol({})).toBeNull();
    expect(originalDeTangol({ TypeCode: "" })).toBeNull();
  });

  it("REQ-10729: no recorta ni cambia mayúsculas: se guarda completa, con espacios incluidos", () => {
    expect(originalDeTangol({ TypeCode: "Excursion ", SubTypeCode: " En Tren" })).toEqual({
      field: "TypeCode|SubTypeCode", value: "Excursion | En Tren",
    });
  });
});
