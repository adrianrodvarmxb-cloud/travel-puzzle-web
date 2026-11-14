import { describe, it, expect } from "vitest";
import { shapeOf } from "./shape";

describe("REQ-10527: forma de una respuesta de Tangol sin mostrar su contenido", () => {
  it("REQ-10527: reporta llaves, tipos y largos; nunca valores de texto", () => {
    const s = shapeOf({ Summary: "Texto largo secreto", PicList: [{ Url: "x" }, { Url: "y" }], Reviews: null, Qty: 4, Ok: true });
    expect(s).toEqual({ Summary: "string(19)", PicList: ["array(2)", { Url: "string(1)" }], Reviews: "null", Qty: "number", Ok: "boolean" });
    expect(JSON.stringify(s)).not.toContain("secreto");
  });
  it("REQ-10527: null, indefinido y arreglos vacíos se distinguen", () => {
    expect(shapeOf(null)).toBe("null");
    expect(shapeOf(undefined)).toBe("undefined");
    expect(shapeOf([])).toEqual(["array(0)"]);
  });
  it("REQ-10527: corta la profundidad para no inflar el reporte", () => {
    expect(shapeOf({ a: { b: { c: { d: 1 } } } }, 2)).toEqual({ a: { b: "object(1 llaves)" } });
  });
});
