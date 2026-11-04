// REQ-028, REQ-029 (INC-001, acción correctiva)
import { describe, expect, it } from "vitest";
import { errorScreenText, parseClientError } from "./clientError";

describe("parseClientError", () => {
  it("REQ-029: acepta un error del navegador y lo recorta para el registro", () => {
    const r = parseClientError({ message: "x".repeat(2000), stack: "s".repeat(9000), path: "/tours?q=1", source: "window" });
    expect(r).not.toBeNull();
    expect(r!.message).toHaveLength(500);
    expect(r!.stack).toHaveLength(4000);
    expect(r!.path).toBe("/tours?q=1");
    expect(r!.source).toBe("window");
  });

  it("REQ-029: rechaza basura (sin mensaje, tipos raros, ruta externa)", () => {
    expect(parseClientError(null)).toBeNull();
    expect(parseClientError({})).toBeNull();
    expect(parseClientError({ message: 123 })).toBeNull();
    expect(parseClientError({ message: "a", path: "https://evil.com" })).toBeNull();
  });

  it("REQ-029: campos opcionales con valor por defecto", () => {
    expect(parseClientError({ message: "boom" })).toEqual({ message: "boom", stack: "", path: "/", source: "unknown", digest: "" });
  });
});

describe("errorScreenText", () => {
  it("REQ-028: pantalla de error con cara Travel Puzzle en español por defecto", () => {
    const t = errorScreenText(undefined);
    expect(t.title).toMatch(/algo/i);
    expect(t.retry).toBeTruthy();
    expect(t.home).toBeTruthy();
  });

  it("REQ-028: inglés si el visitante eligió inglés; idioma desconocido → español", () => {
    expect(errorScreenText("en").retry).toBe("Try again");
    expect(errorScreenText("xx").retry).toBe(errorScreenText("es").retry);
  });

  it("REQ-028: nunca menciona proveedores ni detalles técnicos", () => {
    for (const lang of ["es", "en", "pt", "fr", "de", "it"]) {
      const all = Object.values(errorScreenText(lang)).join(" ");
      expect(all).not.toMatch(/freetour|exception|stack|undefined/i);
    }
  });
});
