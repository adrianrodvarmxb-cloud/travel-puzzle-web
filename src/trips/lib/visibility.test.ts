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
