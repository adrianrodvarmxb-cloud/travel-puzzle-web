import { describe, expect, it } from "vitest";
import { matchDocument, pageOf, unclaimed, docStem } from "./backfill-plan";

// Nombres de archivo de ejemplo (sin contenido): la carpeta real de PDF nunca entra al repo (REQ-748).
const FILES = [
  "a1b2c3d4-TOUR_REGULAR_USD_2027-2028_FANTASTICA_CHINA.pdf", "TOUR_GRAN_LUJO_USD_2027-2028_FANTASTICA_CHINA.pdf",
  "PC_016_-_Colombia_Esencial_Bog__Mde__Ctg_7N.pdf", "TARIFARIO_B2B___INCA_WORLD_PERU___2026___2027_2.pdf",
  "Extensi_n_Mumbai_2027_-_USD.pdf", "2027_-_USD_-_Singapur_-_Hoteles__Tours_v1.pdf", "CONDICIONES_GENERALES_2027_-_USD.pdf",
];

describe("REQ-766 respaldo retroactivo: documento original y página de cada viaje", () => {
  it("REQ-766 cada agencia encuentra su PDF por código o nombre de programa", () => {
    expect(matchDocument("fantasticachina", { ref: "FCH-R7X" }, FILES).file).toBe(FILES[0]);
    expect(matchDocument("fantasticachina", { ref: "FCH-L02" }, FILES).file).toBe(FILES[1]);
    expect(matchDocument("destinocolombia", { ref: "PC-016" }, FILES)).toMatchObject({ kind: "pdf", file: FILES[2], pageToken: "PC 016" });
    expect(matchDocument("incaworld", { ref: "PROG-TRK-01" }, FILES)).toMatchObject({ file: FILES[3], pageToken: "PROG-TRK-01" });
    expect(matchDocument("exoticescapes", { ref: "MUM3" }, FILES).file).toBe(FILES[4]);
    expect(matchDocument("turismoasiatico", { ref: "SIN-03" }, FILES).file).toBe(FILES[5]);
  });
  it("REQ-766 lo que falta se lista como hueco con el motivo; nunca se inventa", () => {
    expect(matchDocument("destinocolombia", { ref: "PC-099" }, FILES).kind).toBe("ninguno");
    expect(matchDocument("extime", { ref: "VAM" }, FILES).note).toMatch(/no hay documento original de Extime/);
    expect(matchDocument("bigbus", { ref: "NYC", source: "https://www.bigbustours.com/en/new-york/x" }, FILES)).toMatchObject({ kind: "web", url: "https://www.bigbustours.com/en/new-york/x" });
    expect(matchDocument("bigbus", { ref: "MIA", source: "miami-tour-tickets-and-passes" }, FILES).kind).toBe("ninguno");
  });
  it("REQ-766 la página es la primera que contiene el código; un PDF corto sin código es la página 1", () => {
    expect(pageOf(["portada", "LIM-01 City tour", "CUS-01"], "CUS-01")).toBe(3);
    expect(pageOf(["portada"], "X")).toBeNull();
    expect(pageOf(["a", "b"], null)).toBe(1);
    expect(pageOf(new Array(40).fill("x"), null)).toBeNull();
  });
  it("REQ-766 los documentos que ningún viaje reclama se reportan aparte", () => {
    expect(unclaimed(FILES, [{ provider: "x", ref: "r", kind: "pdf", file: FILES[0], url: null, page: 1, note: "" }])).toContain("CONDICIONES_GENERALES_2027_-_USD.pdf");
    expect(docStem("/x/a1b2c3d4-PC_016.pdf")).toBe("PC_016.pdf");
  });
});
