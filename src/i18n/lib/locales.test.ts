import { describe, expect, it } from "vitest";
import { htmlLang, ogLocale } from "./locales";

describe("idioma del documento", () => {
  it("REQ-664: <html lang> y og:locale del idioma de la URL; sin bandera o fuera de alcance, español", () => {
    expect(htmlLang({ lang: "en", locked: true })).toBe("en");
    expect(htmlLang({ lang: "en", locked: false })).toBe("es");
    expect(htmlLang(null)).toBe("es");
    expect(["es", "en", "pt", "fr", "it", "de"].map((l) => ogLocale(l as "es"))).toEqual(["es_MX", "en_US", "pt_BR", "fr_FR", "it_IT", "de_DE"]);
  });
});
