import { describe, it, expect } from "vitest";
import { tangolConfig, TANGOL_BASE_URL } from "./config";

describe("tangolConfig", () => {
  const secrets = { TANGOL_EMAIL: "agencia@example.com", TANGOL_CLAVE: "123" };

  it('REQ-1544: apagada por defecto, sin "true" exacto no hay configuración', () => {
    expect(tangolConfig({ ...secrets })).toBeNull();
    expect(tangolConfig({ ...secrets, TANGOL_ENABLED: "false" })).toBeNull();
    expect(tangolConfig({ ...secrets, TANGOL_ENABLED: "TRUE" })).toBeNull();
  });

  it("REQ-1544: encendida pero sin secretos tampoco hay configuración", () => {
    expect(tangolConfig({ TANGOL_ENABLED: "true" })).toBeNull();
    expect(tangolConfig({ TANGOL_ENABLED: "true", TANGOL_EMAIL: "a@b.c" })).toBeNull();
  });

  it("REQ-1544: encendida y con secretos devuelve la configuración con el host oficial", () => {
    expect(tangolConfig({ ...secrets, TANGOL_ENABLED: "true" })).toEqual({
      baseUrl: TANGOL_BASE_URL,
      email: "agencia@example.com",
      clave: "123",
    });
    expect(TANGOL_BASE_URL).toBe("https://tangolapi.tangol.com");
  });
});
