import { describe, expect, it } from "vitest";
import { rawKey, sourceKey, isArchiveKey, safeSegment } from "./raw-keys";

const H = "a".repeat(64);

describe("REQ-541 claves de R2 del archivo crudo", () => {
  it("REQ-541 raw/<proveedor>/<externalId>/<huella>.json", () => {
    expect(rawKey("freetour", 123, H)).toBe(`raw/freetour/123/${H}.json`);
    expect(rawKey("incaworld", "PROG-CUS-03", H)).toBe(`raw/incaworld/PROG-CUS-03/${H}.json`);
  });
  it("REQ-541 un id con caracteres raros se codifica (nunca rompe la ruta) y sin id va a _sin-id", () => {
    expect(rawKey("extime", "a/b c", H)).toBe(`raw/extime/a%2Fb%20c/${H}.json`);
    expect(rawKey("freetour", null, H)).toBe(`raw/freetour/_sin-id/${H}.json`);
    expect(safeSegment("..")).toBe("%2E%2E");
  });
  it("REQ-541 source/<agencia>/<huella8>-<archivo>: el documento nunca se sobrescribe con otro contenido", () => {
    expect(sourceKey("fantasticachina", "TOUR REGULAR 2027.pdf", H)).toBe("source/fantasticachina/aaaaaaaa-TOUR-REGULAR-2027.pdf");
    expect(sourceKey("bigbus", "https://www.bigbustours.com/en/new-york/", "b".repeat(64))).toBe("source/bigbus/bbbbbbbb-www.bigbustours.com-en-new-york.html");
  });
  it("REQ-541 rechaza proveedores o huellas inválidos", () => {
    expect(() => rawKey("Free Tour", 1, H)).toThrow();
    expect(() => rawKey("freetour", 1, "xyz")).toThrow();
    expect(isArchiveKey(`raw/freetour/1/${H}.json`)).toBe(true);
    expect(isArchiveKey("source/extime/aaaaaaaa-x.pdf")).toBe(true);
    expect(isArchiveKey("trips/1-a.jpg")).toBe(false);
  });
});
