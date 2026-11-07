/**
 * D31 (PO): «Nunca mencionar FREETOUR al cliente». Los textos del proveedor (descripción, resumen, título, incluye)
 * se limpian al pintar; la base del sync no se toca (REQ-1240…1243).
 */
import { describe, expect, it } from "vitest";
import { scrubDescription, scrubName, scrubList, scrubTranslation, scrubTourRow } from "./provider-text";
import { mentionsPlatform } from "@/reviews/lib/platform-mention";

const TALLINN =
  "Un guía local da vida al Casco Antiguo.\r\n\r\nMejor visita guiada gratuita del mundo y de Europa en 2023 (Premios FREETOUR.com). Apreciada por los viajeros desde 2019.\r\n\r\nVERÁS:\r\nEl castillo de Toompea";

describe("REQ-1240 descripciones y resúmenes sin la plataforma", () => {
  it("REQ-1240 quita la oración que la nombra y conserva el resto con sus saltos de línea", () => {
    const out = scrubDescription(TALLINN)!;
    expect(mentionsPlatform(out)).toBe(false);
    expect(out).toBe("Un guía local da vida al Casco Antiguo.\r\n\r\nApreciada por los viajeros desde 2019.\r\n\r\nVERÁS:\r\nEl castillo de Toompea");
  });
  it("REQ-1240 cubre las variantes (freetour, freetours, FreeTour.com, free tour .com, www.freetour.com) en cualquier idioma", () => {
    for (const s of [
      "Best tour. Book it on freetour.com today!",
      "Gewinner der FreeTour.com Awards. Danach Kaffee.",
      "Melhor tour. Veja em www.freetour.com/lisboa agora.",
      "Top. Reservado por freetours. Fin.",
      "Ok. Leia no free tour .com. Fim.",
    ]) expect(mentionsPlatform(scrubDescription(s))).toBe(false);
    expect(scrubDescription("Best tour. Book it on freetour.com today!")).toBe("Best tour.");
  });
  it("REQ-1240 «free tour» como categoría genérica NO se toca; vacío o null queda null", () => {
    expect(scrubDescription("Free tour por el centro. Al final das propina.")).toBe("Free tour por el centro. Al final das propina.");
    expect(scrubDescription("Premios FREETOUR.com.")).toBeNull();
    expect(scrubDescription(null)).toBeNull();
    expect(scrubDescription("")).toBeNull();
  });
});

describe("REQ-1241 títulos y textos cortos: se quita solo el nombre (el título real se conserva, C4)", () => {
  it("REQ-1241 quita el paréntesis o el nombre y limpia espacios y signos sueltos", () => {
    expect(scrubName("Tour de Tallin (Premios FREETOUR.com 2023)")).toBe("Tour de Tallin");
    expect(scrubName("Freetour Madrid: lo esencial")).toBe("Madrid: lo esencial");
    expect(scrubName("Lo esencial de Roma - FreeTour.com")).toBe("Lo esencial de Roma");
    expect(scrubName("Free Tour de Budapest")).toBe("Free Tour de Budapest");
    expect(scrubName(null)).toBe("");
  });
  it("REQ-1241 si el título era solo la plataforma, queda vacío (nunca la muestra)", () => {
    expect(scrubName("FREETOUR.com")).toBe("");
  });
});

describe("REQ-1242 listas («incluye») sin la plataforma", () => {
  it("REQ-1242 limpia cada elemento y descarta los que quedan vacíos", () => {
    expect(scrubList(["Guía local", "Insignia de FREETOUR.com", "Agua"])).toEqual(["Guía local", "Agua"]);
    expect(scrubList(null)).toEqual([]);
  });
});

describe("REQ-1243 traducción del proveedor lista para el cliente", () => {
  it("REQ-1243 limpia título, resumen y descripción y no cambia los demás campos", () => {
    const tr = { language: "es", title: "Tallin (Premios FREETOUR.com)", brief: "Premiado por FREETOUR. Gratis.", description: TALLINN, url: "x" };
    const out = scrubTranslation(tr);
    expect(out).toEqual({ language: "es", title: "Tallin", brief: "Gratis.", description: scrubDescription(TALLINN), url: "x" });
    expect(tr.title).toBe("Tallin (Premios FREETOUR.com)"); // no muta el dato original
  });
});

describe("REQ-1243 fila de tour (lista de /tours, ficha y su JSON-LD) sin la plataforma", () => {
  it("REQ-1243 limpia cada traducción y el «incluye»; el resto de la fila no cambia", () => {
    const row = { id: "t1", externalId: 9, translations: [{ language: "es", title: "Tallin", brief: "Premiado por FREETOUR. Gratis.", description: TALLINN }], includes: ["Guía", "Pin de freetour.com"], priceValue: 0 };
    const out = scrubTourRow(row);
    expect(out.translations[0].brief).toBe("Gratis.");
    expect(mentionsPlatform(JSON.stringify(out))).toBe(false);
    expect(out.includes).toEqual(["Guía"]);
    expect({ ...out, translations: row.translations, includes: row.includes }).toEqual(row);
  });
  it("REQ-1243 sin traducciones ni «incluye» (o con «incluye» que no es lista) no falla", () => {
    const bare: { id: string; includes?: unknown } = { id: "x" };
    expect(scrubTourRow(bare)).toEqual({ id: "x" });
    expect(scrubTourRow({ ...bare, includes: null })).toEqual({ id: "x", includes: null });
  });
});
