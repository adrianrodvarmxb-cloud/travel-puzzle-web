import { describe, expect, it } from "vitest";
import { buildImportSql, type ImportRow } from "./bulk-import";
import { tripInputSchema } from "../schemas/trip";
import { classifyFormato } from "@/taxonomy/lib/format";
import { isPublishable } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { DEFAULT_GATES } from "@/taxonomy/lib/gates";

// REQ-1348 (punto 3, PO 7-11 15:20): un proveedor nuevo (adaptador o importación) no publica una experiencia sin formato
// del diccionario: queda en borrador y va a la lista de dudas del PO.
const AG = { id: "ag-x", name: "Proveedor Nuevo", initials: "PNV" };
const img = (n: number) => ({ key: `trips/1762300000-pnv${n}.jpg`, alt: "Foto" });
const trip = (over: Record<string, unknown> = {}) =>
  tripInputSchema.parse({
    kind: "circuito", purchaseMode: "quote", titleEs: "Circuito por el sur", summaryEs: "Resumen", highlights: ["a", "b", "c"],
    descriptionEs: "Descripción", includes: ["Guía"], excludes: ["Vuelos"], countries: ["PE"], durationDays: 6, languages: ["es"],
    currency: "USD", options: [{ id: "c", name: "Compartido", adult: 900 }], meetingPoints: [{ name: "Hotel", lat: -12.1, lng: -77 }], images: [1].map(img), ...over,
  });

describe("REQ-1348: sin formato del diccionario no se publica (va a dudas)", () => {
  it("REQ-1348: un viaje con formato del diccionario se publica y el reporte dice su formato", () => {
    const { report } = buildImportSql([{ ref: "A-1", status: "published", trip: trip() }], AG, "2026-11-07T00:00:00.000+00:00");
    expect(report[0]).toMatchObject({ status: "published", formato: "circuito", duda: false, missing: [] });
  });
  it("REQ-1348: un tipo que el mapeo no conoce queda en borrador, con el faltante y marcado como duda", () => {
    const raro = { ...trip(), kind: "safari-en-globo" } as unknown as ImportRow["trip"];
    const { report, sql } = buildImportSql([{ ref: "A-2", status: "published", trip: raro }], AG, "2026-11-07T00:00:00.000+00:00");
    expect(report[0].status).toBe("draft");
    expect(report[0].duda).toBe(true);
    expect(report[0].missing.join(" ")).toMatch(/formato del diccionario/);
    expect(sql.join("\n")).not.toMatch(/'published'/);
  });
  it("REQ-1348: FREETOUR con una categoría nueva → por-revisar, que no se publica ni en /destinos ni en /tours (G-T10 = A)", () => {
    const r = classifyFormato({ proveedor: "freetour", categoriaId: "99", precio: 20, titulo: "Algo nuevo" }, DEFAULT_DICTIONARY, DEFAULT_MAPPINGS.freetour, DEFAULT_GATES);
    expect(r.valor).toBe("por-revisar");
    expect(isPublishable(r.valor, "/destinos")).toBe(false);
    expect(isPublishable(r.valor, "/tours")).toBe(false);
  });
  it("REQ-1348: un proveedor sin mapeo → por-revisar", () => {
    expect(classifyFormato({ proveedor: "nuevo", categoriaId: "1", precio: 10, titulo: "x" }, DEFAULT_DICTIONARY, undefined, DEFAULT_GATES).valor).toBe("por-revisar");
  });
});
