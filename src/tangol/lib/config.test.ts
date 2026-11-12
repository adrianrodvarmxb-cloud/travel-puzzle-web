import { describe, it, expect } from "vitest";
import { tangolConfig } from "./config";

describe("tangolConfig", () => {
  const gateway = { GATEWAY_URL: "https://pasarela.travelpuzzle.com.mx", GATEWAY_SECRET: "s" };

  it('REQ-1552: apagada por defecto, sin "true" exacto no hay configuración', () => {
    expect(tangolConfig({ ...gateway })).toBeNull();
    expect(tangolConfig({ ...gateway, TANGOL_ENABLED: "false" })).toBeNull();
    expect(tangolConfig({ ...gateway, TANGOL_ENABLED: "TRUE" })).toBeNull();
  });

  it("REQ-1552: encendida pero sin la pasarela configurada tampoco hay configuración", () => {
    expect(tangolConfig({ TANGOL_ENABLED: "true" })).toBeNull();
    expect(tangolConfig({ TANGOL_ENABLED: "true", GATEWAY_URL: "https://x" })).toBeNull();
  });

  it("REQ-1552: encendida devuelve solo la pasarela (las claves de Tangol viven en cPanel, no en el sitio)", () => {
    expect(tangolConfig({ ...gateway, TANGOL_ENABLED: "true" })).toEqual({ gatewayUrl: "https://pasarela.travelpuzzle.com.mx", secret: "s" });
  });
});
