import { describe, it, expect } from "vitest";
import { tripCopy } from "./copy";

describe("tripCopy", () => {
  it("los 6 idiomas tienen todas las llaves, y nunca nombran al proveedor", () => {
    const keys = Object.keys(tripCopy("es"));
    for (const l of ["es", "en", "pt", "de", "fr", "it"]) {
      expect(Object.keys(tripCopy(l))).toEqual(keys);
      expect(JSON.stringify(tripCopy(l))).not.toMatch(/freetour\.com/i);
    }
    expect(tripCopy("xx").from).toBe("From");
    expect(tripCopy("es").child(3, 11)).toBe("Niño (3–11 años)");
    for (const l of ["es", "en", "pt", "de", "fr", "it"]) {
      expect(tripCopy(l).kinds.transporte).toBeTruthy();
      expect(tripCopy(l).filterTransport).toBeTruthy();
    }
    expect(tripCopy("es").kinds.transporte).toBe("Transporte");
  });
});
