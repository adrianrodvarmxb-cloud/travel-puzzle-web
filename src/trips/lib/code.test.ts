import { describe, it, expect } from "vitest";
import { suggestInitials, tripCode, TP_INITIALS } from "./code";

describe("suggestInitials", () => {
  it("iniciales de las palabras importantes, sin acentos", () => {
    expect(suggestInitials("Europa Mundo Viajes", [])).toBe("EMV");
    expect(suggestInitials("Viajes de Ensueño del Sur", [])).toBe("VES");
    expect(suggestInitials("Andina", [])).toBe("AND");
  });
  it("nunca TP (Travel Puzzle) ni una sigla ya usada", () => {
    expect(suggestInitials("Turismo Patagonia", [])).not.toBe(TP_INITIALS);
    expect(suggestInitials("Europa Mundo Viajes", ["EMV"])).toBe("EMV2");
  });
});

describe("tripCode", () => {
  it("transporte usa la letra M (movilidad)", () => {
    expect(tripCode({ initials: "BBT", countries: ["FR"], kind: "transporte", durationDays: 1, seq: 1 })).toBe("BBT-FR-M01-001");
  });
  it("AGENCIA-PAÍS-TIPO+DÍAS-NÚM", () => {
    expect(tripCode({ initials: "TP", countries: ["MX"], kind: "unica", durationDays: 1, seq: 7 })).toBe("TP-MX-E01-007");
    expect(tripCode({ initials: "EMV", countries: ["ES", "FR", "IT"], kind: "circuito", durationDays: 15, seq: 42 })).toBe("EMV-EUR-C15-042");
    expect(tripCode({ initials: "TP", countries: ["JP"], kind: "personalizado", durationDays: 10, seq: 3 })).toBe("TP-JP-P10-003");
  });
  it("varios continentes = MUL; sin países = XX; sin días = 00", () => {
    expect(tripCode({ initials: "TP", countries: ["MX", "JP"], kind: "tour", durationDays: null, seq: 1 })).toBe("TP-MUL-T00-001");
    expect(tripCode({ initials: "TP", countries: [], kind: "tour", durationDays: 2, seq: 1000 })).toBe("TP-XX-T02-1000");
  });
});
