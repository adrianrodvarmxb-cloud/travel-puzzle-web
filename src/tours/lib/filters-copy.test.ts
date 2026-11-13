import { describe, it, expect } from "vitest";
import { filtersCopy, guideLanguageName, durationStopLabel, DURATION_STOPS } from "./filters-copy";

describe("REQ-056 textos de filtros", () => {
  it("REQ-056: 6 idiomas con respaldo en inglés y botón con conteo", () => {
    // REQ-3509 reemplaza el texto de REQ-056: ahora «experiencias» (ver bloque REQ-3509).
    expect(filtersCopy("es").see(76)).toBe("Ver 76 experiencias");
    expect(filtersCopy("xx").title).toBe("Filters");
    expect(guideLanguageName("en", "es")).toBe("Inglés");
    expect(guideLanguageName("es", "fr")).toBe("Espagnol");
  });
  it("REQ-056: paradas del deslizador de duración", () => {
    expect(DURATION_STOPS[0]).toBe(0);
    expect(durationStopLabel(120, "es")).toBe("2 h");
    expect(durationStopLabel(1440, "es")).toBe("1 día");
    expect(durationStopLabel(10080, "en")).toBe("7 days");
  });
});

describe("REQ-3509: el botón de filtros dice «experiencias» (taxonomía G1)", () => {
  it("REQ-3509: «Ver N experiencias» en los 6 idiomas", () => {
    expect(filtersCopy("es").see(76)).toBe("Ver 76 experiencias");
    expect(filtersCopy("en").see(76)).toBe("See 76 experiences");
    expect(filtersCopy("pt").see(76)).toBe("Ver 76 experiências");
    expect(filtersCopy("de").see(76)).toBe("76 Erlebnisse ansehen");
    expect(filtersCopy("fr").see(76)).toBe("Voir 76 expériences");
    expect(filtersCopy("it").see(76)).toBe("Vedi 76 esperienze");
  });
});
