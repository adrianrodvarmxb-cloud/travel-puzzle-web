import { describe, expect, it } from "vitest";
import { anyVisible, isKindVisible, visibilityFromEnv } from "./visibility";

describe("isKindVisible", () => {
  it("con los dos apagados no se ve nada", () => {
    const f = { own: false, transport: false };
    expect(isKindVisible("tour", f)).toBe(false);
    expect(isKindVisible("transporte", f)).toBe(false);
    expect(anyVisible(f)).toBe(false);
  });
  it("solo transporte: se ve solo el transporte", () => {
    const f = { own: false, transport: true };
    expect(isKindVisible("transporte", f)).toBe(true);
    expect(isKindVisible("tour", f)).toBe(false);
    expect(isKindVisible("circuito", f)).toBe(false);
    expect(anyVisible(f)).toBe(true);
  });
  it("solo viajes propios: el transporte no se ve", () => {
    const f = { own: true, transport: false };
    expect(isKindVisible("transporte", f)).toBe(false);
    expect(isKindVisible("tour", f)).toBe(true);
    expect(isKindVisible("personalizado", f)).toBe(true);
  });
  it("los dos encendidos: se ve todo", () => {
    const f = { own: true, transport: true };
    expect(isKindVisible("transporte", f)).toBe(true);
    expect(isKindVisible("unica", f)).toBe(true);
  });
});

describe("visibilityFromEnv", () => {
  it("solo 'true' enciende", () => {
    expect(visibilityFromEnv({ OWN_TOURS_ENABLED: "true", TRANSPORT_ENABLED: "1" })).toEqual({ own: true, transport: false });
    expect(visibilityFromEnv({ TRANSPORT_ENABLED: "true" })).toEqual({ own: false, transport: true });
    expect(visibilityFromEnv({})).toEqual({ own: false, transport: false });
  });
});

describe("REQ-008: la venta cruzada respeta TRANSPORT_ENABLED y va aislada", () => {
  it("REQ-008: con TRANSPORT_ENABLED apagada ningún transporte es visible para la franja ni la ventana", () => {
    const f = visibilityFromEnv({ OWN_TOURS_ENABLED: "true", TRANSPORT_ENABLED: "false" });
    expect(isKindVisible("transporte", f)).toBe(false);
    expect(visibilityFromEnv({ TRANSPORT_ENABLED: "true" }).transport).toBe(true);
    expect(visibilityFromEnv({ TRANSPORT_ENABLED: "TRUE" }).transport).toBe(false); // solo el texto exacto "true"
  });
  it("REQ-008: la franja de tours de la ficha de un transporte va dentro de un SectionBoundary (si falla, la ficha sigue)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../../components/trips/TripDetailView.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/<SectionBoundary name="franja-tours">/);
  });
});
