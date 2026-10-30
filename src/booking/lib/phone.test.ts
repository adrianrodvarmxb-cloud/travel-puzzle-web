import { describe, it, expect } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("quita espacios, guiones y paréntesis y conserva el +", () => {
    expect(normalizePhone("+52 (55) 1234-5678")).toBe("+525512345678");
  });
  it("número mexicano de 10 dígitos sin lada: agrega +52", () => {
    expect(normalizePhone("55 1234 5678")).toBe("+525512345678");
  });
  it("con 00 internacional lo cambia por +", () => {
    expect(normalizePhone("0034 600 123 456")).toBe("+34600123456");
  });
  it("vacío = sin teléfono; inválido = null", () => {
    expect(normalizePhone("")).toBeUndefined();
    expect(normalizePhone(undefined)).toBeUndefined();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });
});
