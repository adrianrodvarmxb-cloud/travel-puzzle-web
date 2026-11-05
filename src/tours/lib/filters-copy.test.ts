import { describe, it, expect } from "vitest";
import { filtersCopy, guideLanguageName, durationStopLabel, DURATION_STOPS } from "./filters-copy";

describe("REQ-056 textos de filtros", () => {
  it("REQ-056: 6 idiomas con respaldo en inglés y botón con conteo", () => {
    expect(filtersCopy("es").see(76)).toBe("Ver 76 actividades");
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
