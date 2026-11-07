import { describe, expect, it } from "vitest";
import { suggestLanguage, suggestionCopy } from "./suggest";

describe("suggestLanguage", () => {
  it("REQ-657: sugiere la preferencia guardada si es distinta del idioma de la URL", () => {
    expect(suggestLanguage({ routeLang: "es", stored: "en", cookie: null, browser: "fr-FR" })).toBe("en");
    expect(suggestLanguage({ routeLang: "es", stored: null, cookie: "pt", browser: "fr-FR" })).toBe("pt");
  });

  it("REQ-657: sin preferencia guardada usa el idioma del navegador (solo los que tenemos)", () => {
    expect(suggestLanguage({ routeLang: "es", stored: null, cookie: null, browser: "de-AT" })).toBe("de");
    expect(suggestLanguage({ routeLang: "es", stored: null, cookie: null, browser: "ja-JP" })).toBeNull();
  });

  it("REQ-657: no sugiere si ya coincide, si se cerró o si el valor no es válido", () => {
    expect(suggestLanguage({ routeLang: "en", stored: "en", cookie: null, browser: "fr" })).toBeNull();
    expect(suggestLanguage({ routeLang: "es", stored: "en", cookie: null, browser: null, dismissed: true })).toBeNull();
    expect(suggestLanguage({ routeLang: "es", stored: "xx", cookie: "yy", browser: null })).toBeNull();
  });

  it("REQ-657: el aviso se escribe en el idioma sugerido, con su nombre", () => {
    expect(suggestionCopy("en").text).toBe("This page is also available in English.");
    expect(suggestionCopy("es").cta).toBe("Ver en español");
    for (const l of ["es", "en", "pt", "fr", "it", "de"] as const) {
      const c = suggestionCopy(l);
      expect(c.text && c.cta && c.close).toBeTruthy();
    }
  });
});
