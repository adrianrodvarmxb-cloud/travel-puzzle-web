import { describe, expect, it } from "vitest";
import { cancelNotice, parseUtc } from "./cancel-policy";

const now = new Date("2026-11-05T12:00:00Z");

// REQ-934 (D3): antes de confirmar la cancelación se muestra la regla de 24 h de los tours de pago.
describe("REQ-934 cancelNotice", () => {
  it("REQ-934: free tour → gratis, sin texto extra al confirmar", () => {
    expect(cancelNotice({ paid: false, eventUtcDate: "2026-11-05 13:00:00" }, now)).toEqual({ summary: "Cancela para liberar tu lugar para otro viajero. No tiene costo.", confirm: null });
  });
  it("REQ-934: tour de pago con más de 24 h → regla + reembolso automático", () => {
    const n = cancelNotice({ paid: true, eventUtcDate: "2026-11-07 10:00:00" }, now);
    expect(n.summary).toBe("Cancelación gratis con reembolso hasta 24 h antes del tour; después, sin reembolso.");
    expect(n.confirm).toBe("Faltan más de 24 h: si cancelas ahora, el reembolso de lo pagado es automático.");
  });
  it("REQ-934: tour de pago con menos de 24 h → sin reembolso, dicho antes de confirmar", () => {
    expect(cancelNotice({ paid: true, eventUtcDate: "2026-11-06 06:00:00" }, now).confirm).toBe("Faltan menos de 24 h: si cancelas ahora no hay reembolso.");
  });
  it("REQ-934: exactamente 24 h → todavía con reembolso", () => {
    expect(cancelNotice({ paid: true, eventUtcDate: "2026-11-06T12:00:00Z" }, now).confirm).toMatch(/reembolso de lo pagado es automático/);
  });
  it("REQ-934: sin fecha UTC → solo la regla, sin afirmar si toca reembolso", () => {
    expect(cancelNotice({ paid: true, eventUtcDate: null }, now)).toEqual({ summary: "Cancelación gratis con reembolso hasta 24 h antes del tour; después, sin reembolso.", confirm: "Cancelación gratis con reembolso hasta 24 h antes del tour; después, sin reembolso." });
  });
  it("REQ-934: parseUtc acepta «YYYY-MM-DD HH:mm:ss» como UTC", () => {
    expect(parseUtc("2026-11-06 06:00:00")).toBe(Date.parse("2026-11-06T06:00:00Z"));
    expect(Number.isNaN(parseUtc("x"))).toBe(true);
  });
});
