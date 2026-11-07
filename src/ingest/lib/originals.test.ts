import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { originalOf, declaredOf } from "./originals";
import { providerOfAgency } from "./import-archive";
import { AGENCY_MAPPINGS } from "@/taxonomy/data";

describe("REQ-553 denominación ORIGINAL del proveedor en cada viaje importado", () => {
  it("REQ-553 original.categoria explícita gana (campo literal del proveedor)", () => {
    expect(originalOf("extime", { ref: "X", original: { categoria: "Excursions" } })).toEqual({ field: "original.categoria", value: "Excursions", matchedTerm: null });
  });
  it("REQ-553 Big Bus: del segmento de la URL del producto (campo source)", () => {
    expect(originalOf("bigbus", { ref: "NYC", source: "https://www.bigbustours.com/en/new-york/new-york-tour-tickets-and-passes" }))
      .toEqual({ field: "source", value: "tour-tickets-and-passes", matchedTerm: "tour-tickets-and-passes" });
    expect(originalOf("bigbus", { ref: "LAX", source: "https://bigbustours.com/en/los-angeles/tickets-passes" })?.matchedTerm).toBe("tickets-passes");
    expect(originalOf("bigbus", { ref: "BOS", source: "https://bigbustours.com/en/boston" })).toBeNull();
  });
  it("REQ-553 Fantástica China, Destino Colombia e Inca World: del código del proveedor (ref)", () => {
    expect(originalOf("fantasticachina", { ref: "FCH-R7X" })).toEqual({ field: "ref", value: "TOUR REGULAR", matchedTerm: "FCH-R" });
    expect(originalOf("fantasticachina", { ref: "FCH-L03" })?.value).toBe("TOUR GRAN LUJO");
    expect(originalOf("destinocolombia", { ref: "PC-016" })?.value).toBe("PC");
    expect(originalOf("incaworld", { ref: "PROG-TRK-01" })?.value).toBe("PROGRAMA");
    expect(originalOf("incaworld", { ref: "LIM-01" })?.value).toBe("SERVICIO");
  });
  it("REQ-553 sin denominación en el registro (Extime, Exotic Escapes, Turismo Asiático hoy): null, nunca se inventa", () => {
    expect(originalOf("extime", { ref: "VAM", source: "Programa Extime Travel (código VAM)" })).toBeNull();
    expect(originalOf("exoticescapes", { ref: "TO7" })).toBeNull();
    expect(originalOf("turismoasiatico", { ref: "MYS-01" })).toBeNull();
  });
  it("REQ-553 toda denominación derivada de los imports del repo existe en el mapeo de su agencia", () => {
    for (const f of readdirSync("imports").filter((x) => x.endsWith(".json"))) {
      const b = JSON.parse(readFileSync(`imports/${f}`, "utf8"));
      const p = providerOfAgency(b.agency.id)!;
      for (const e of b.trips) {
        const o = originalOf(p, e);
        if (o) expect(AGENCY_MAPPINGS[p].categorias.map((c) => c.id), `${f} ${e.ref}`).toContain(o.value);
      }
    }
  });
  it("REQ-554 lo que el registro declara en vocabulario de Travel Puzzle (taxonomia) se valida antes de guardarse", () => {
    expect(declaredOf({ taxonomia: { formato: "excursion-dia", temas: ["cultural", "inventado"] } })).toBe('{"formato":"excursion-dia","temas":["cultural"]}');
    expect(declaredOf({ taxonomia: { formato: "xyz" } })).toBeNull();
    expect(declaredOf({})).toBeNull();
  });
});
