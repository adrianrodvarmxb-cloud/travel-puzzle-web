import { describe, it, expect } from "vitest";
import { tallyTourTypes, formatTypeTally } from "./types-report";

describe("catálogo de tipos de Tangol", () => {
  it("REQ-3486: cuenta los tipos distintos y guarda hasta tres ejemplos, del más común al menos común", () => {
    const rows = tallyTourTypes([
      { typeCode: "TR", subTypeCode: "APT", tourType: 2, title: "Traslado aeropuerto Ezeiza" },
      { typeCode: "TR", subTypeCode: "APT", tourType: 2, title: "Traslado aeropuerto Bariloche" },
      { typeCode: "TR", subTypeCode: "APT", tourType: 2, title: "Traslado hotel centro" },
      { typeCode: "TR", subTypeCode: "APT", tourType: 2, title: "Cuarto ejemplo, no entra" },
      { typeCode: "EX", subTypeCode: "FD", tourType: 1, title: "Excursión Tigre" },
    ]);
    expect(rows[0]).toEqual({ typeCode: "TR", subTypeCode: "APT", tourType: "2", tours: 4, examples: ["Traslado aeropuerto Ezeiza", "Traslado aeropuerto Bariloche", "Traslado hotel centro"] });
    expect(rows[1].tours).toBe(1);
  });

  it("REQ-3486: un tipo vacío o ausente se reporta como «(vacío)» en vez de perderse", () => {
    const rows = tallyTourTypes([{ typeCode: null, subTypeCode: "", tourType: null, title: "Sin tipo" }]);
    expect(rows[0]).toMatchObject({ typeCode: "(vacío)", subTypeCode: "(vacío)", tourType: "(vacío)", tours: 1 });
  });

  it("REQ-3486: la tabla trae el total y una fila por tipo, sin precios ni datos del proveedor", () => {
    const texto = formatTypeTally(tallyTourTypes([{ typeCode: "EX", subTypeCode: "FD", tourType: 1, title: "Excursión Tigre" }]), 1);
    expect(texto).toContain("Tipos distintos: 1 — tours leídos: 1");
    expect(texto).toContain("| EX | FD | 1 | 1 | Excursión Tigre |");
    expect(texto).not.toMatch(/precio|neto|tangol/i);
  });
});
