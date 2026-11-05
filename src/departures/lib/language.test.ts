import { describe, it, expect } from "vitest";
import { languageCode } from "./language";
import { summarize } from "./summary";

describe("REQ-114 idioma de las salidas a código ISO 639-1", () => {
  it("REQ-114: nombres completos en inglés (como los manda Freetour)", () => {
    expect(languageCode("Spanish")).toBe("es");
    expect(languageCode("German")).toBe("de");
    expect(languageCode("Portuguese")).toBe("pt");
    expect(languageCode("Polish")).toBe("pl");
    expect(languageCode("Chinese")).toBe("zh");
    expect(languageCode("Dutch")).toBe("nl");
    expect(languageCode("English")).toBe("en");
  });
  it("REQ-114: nombres nativos y códigos ya ISO", () => {
    expect(languageCode("Español")).toBe("es");
    expect(languageCode("Deutsch")).toBe("de");
    expect(languageCode("es")).toBe("es");
    expect(languageCode("pt-BR")).toBe("pt");
    expect(languageCode("ES")).toBe("es");
  });
  it("REQ-114: lo desconocido no se inventa", () => {
    expect(languageCode("Klingon")).toBeNull();
    expect(languageCode("")).toBeNull();
  });
  it("REQ-114: el resumen usa códigos ISO, sin 'sp' ni 'ge'", () => {
    const s = summarize([{ date: "2026-11-08", language: "Spanish" }, { date: "2026-11-09", language: "German" }, { date: "2026-11-09", language: "Klingon" }], "2026-11-05");
    expect(s.languages).toEqual(["de", "es"]);
  });
});
