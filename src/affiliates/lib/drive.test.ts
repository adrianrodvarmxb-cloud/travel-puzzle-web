// REQ-027 — Travelpayouts Drive solo carga con la bandera encendida y en las rutas elegidas.
import { describe, expect, it } from "vitest";
import { DRIVE_SRC, driveConfig, shouldLoadDrive } from "./drive";

describe("Travelpayouts Drive", () => {
  it("REQ-027: apagado por defecto; solo 'true' enciende", () => {
    expect(driveConfig({}).enabled).toBe(false);
    expect(driveConfig({ AFFILIATES_ENABLED: "1" }).enabled).toBe(false);
    expect(driveConfig({ AFFILIATES_ENABLED: "true" }).enabled).toBe(true);
  });

  it("REQ-027: rutas por defecto /trenes y /traslados; se pueden configurar", () => {
    expect(driveConfig({}).paths).toEqual(["/trenes", "/traslados"]);
    expect(driveConfig({ AFFILIATE_PATHS: " /trenes , /hoteles ,," }).paths).toEqual(["/trenes", "/hoteles"]);
  });

  it("REQ-027: carga solo en esas rutas y sus subrutas, nunca en fichas de tours", () => {
    const cfg = { enabled: true, paths: ["/trenes", "/traslados"] };
    expect(shouldLoadDrive("/trenes", cfg)).toBe(true);
    expect(shouldLoadDrive("/trenes/japon", cfg)).toBe(true);
    expect(shouldLoadDrive("/trenesx", cfg)).toBe(false);
    expect(shouldLoadDrive("/tours/abc", cfg)).toBe(false);
    expect(shouldLoadDrive("/", cfg)).toBe(false);
    expect(shouldLoadDrive("/trenes", { ...cfg, enabled: false })).toBe(false);
  });

  it("REQ-027: '/' solo coincide con la portada exacta (verificación de Travelpayouts)", () => {
    const cfg = { enabled: true, paths: ["/"] };
    expect(shouldLoadDrive("/", cfg)).toBe(true);
    expect(shouldLoadDrive("/tours/abc", cfg)).toBe(false);
  });

  it("REQ-027: el script es el de Travelpayouts para nuestra cuenta (https)", () => {
    expect(DRIVE_SRC).toBe("https://emrld.ltd/NTk1Nzkx.js?t=595791");
  });
});
