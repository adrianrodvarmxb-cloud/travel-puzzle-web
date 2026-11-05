import { describe, it, expect } from "vitest";
import { parseGuideLanguage, parseTripDate, GUIDE_LANGUAGE_OPTIONS } from "./params";

describe("REQ-049 parámetros de URL (?idioma=, ?fecha=)", () => {
  it("REQ-049: idioma solo de la lista; cualquier otra cosa se ignora", () => {
    expect(parseGuideLanguage("en")).toBe("en");
    expect(parseGuideLanguage("EN")).toBe("en");
    expect(parseGuideLanguage("xx")).toBeNull();
    expect(parseGuideLanguage(null)).toBeNull();
    expect(GUIDE_LANGUAGE_OPTIONS).toContain("es");
  });
  it("REQ-049: fecha válida, no pasada y dentro de 60 días", () => {
    expect(parseTripDate("2026-11-10", "2026-11-05")).toBe("2026-11-10");
    expect(parseTripDate("2026-11-04", "2026-11-05")).toBeNull();
    expect(parseTripDate("2027-03-01", "2026-11-05")).toBeNull();
    expect(parseTripDate("10/11/2026", "2026-11-05")).toBeNull();
    expect(parseTripDate("2026-02-30", "2026-01-05")).toBeNull();
  });
});
