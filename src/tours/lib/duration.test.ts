import { describe, it, expect } from "vitest";
import { durationMinutes, DURATION_RANGES, parseDurationRange, durationRangeWhere, durationLabel } from "./duration";

describe("duración de los tours", () => {
  it("convierte H:MM a minutos", () => {
    expect(durationMinutes("2:15")).toBe(135);
    expect(durationMinutes("0:45")).toBe(45);
    expect(durationMinutes("10:00")).toBe(600);
    expect(durationMinutes(" 3:5 ")).toBe(185);
  });
  it("valores vacíos o raros quedan sin duración", () => {
    for (const v of [null, undefined, "", "abc", "2", "2:75", "-1:00", "0:00"]) expect(durationMinutes(v)).toBeNull();
  });
  it("tres rangos: hasta 2 h, de 2 a 4 h, más de 4 h", () => {
    expect(DURATION_RANGES).toEqual(["short", "mid", "long"]);
    expect(durationRangeWhere("short")).toEqual({ lte: 120 });
    expect(durationRangeWhere("mid")).toEqual({ gt: 120, lte: 240 });
    expect(durationRangeWhere("long")).toEqual({ gt: 240 });
  });
  it("lee el rango de la URL; cualquier otra cosa es sin filtro", () => {
    expect(parseDurationRange("mid")).toBe("mid");
    expect(parseDurationRange("x")).toBeNull();
    expect(parseDurationRange(null)).toBeNull();
  });
  it("etiquetas en ambos idiomas", () => {
    expect(durationLabel("short", "es")).toBe("Hasta 2 h");
    expect(durationLabel("mid", "es")).toBe("2 a 4 h");
    expect(durationLabel("long", "en")).toBe("4 h +");
  });
});
