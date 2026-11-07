import { describe, expect, it } from "vitest";
import { diffAuditoria } from "./audit-diff";

describe("REQ-871: auditoría de tipos antes / después por proveedor", () => {
  it("REQ-871: lista los cambios, los movimientos y los conteos por proveedor y formato", () => {
    const antes = [
      { proveedor: "FREETOUR (pago)", id: "2810", formato: "excursion-dia" },
      { proveedor: "FREETOUR (pago)", id: "42539", formato: "excursion-dia" },
      { proveedor: "FREETOUR (pago)", id: "2047", formato: "caminata" },
      { proveedor: "Extime Travel", id: "EXT-1", formato: "tour" },
    ];
    const despues = [
      { proveedor: "FREETOUR (pago)", id: "2810", formato: "tour" },
      { proveedor: "FREETOUR (pago)", id: "42539", formato: "excursion-dia" },
      { proveedor: "FREETOUR (pago)", id: "2047", formato: "experiencia-unica" },
      { proveedor: "Extime Travel", id: "EXT-1", formato: "tour" },
    ];
    const d = diffAuditoria(antes, despues);
    expect(d.cambios).toEqual([
      { proveedor: "FREETOUR (pago)", id: "2810", antes: "excursion-dia", despues: "tour" },
      { proveedor: "FREETOUR (pago)", id: "2047", antes: "caminata", despues: "experiencia-unica" },
    ]);
    expect(d.movimientos["FREETOUR (pago)"]).toEqual({ "excursion-dia → tour": 1, "caminata → experiencia-unica": 1 });
    expect(d.conteos["FREETOUR (pago)"]["excursion-dia"]).toEqual({ antes: 2, despues: 1 });
    expect(d.conteos["Extime Travel"]).toEqual({ tour: { antes: 1, despues: 1 } });
    expect(d.movimientos["Extime Travel"]).toBeUndefined();
  });
});
