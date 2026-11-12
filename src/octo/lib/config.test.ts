import { describe, it, expect } from "vitest";
import { bigBusOctoConfig, octoHeaders, VENTRATA_OCTO_BASE_URL } from "./config";

describe("bigBusOctoConfig", () => {
  it("REQ-3324: apagado o sin llave = null (no se llama a Ventrata)", () => {
    expect(bigBusOctoConfig({})).toBeNull();
    expect(bigBusOctoConfig({ BIGBUS_OCTO_ENABLED: "false", BIGBUS_OCTO_API_KEY: "k" })).toBeNull();
    expect(bigBusOctoConfig({ BIGBUS_OCTO_ENABLED: "true" })).toBeNull();
    expect(bigBusOctoConfig({ BIGBUS_OCTO_ENABLED: "true", BIGBUS_OCTO_API_KEY: "   " })).toBeNull();
  });

  it("REQ-3324: encendido usa api.ventrata.com/octo y modo prueba por omisión", () => {
    expect(bigBusOctoConfig({ BIGBUS_OCTO_ENABLED: "true", BIGBUS_OCTO_API_KEY: "k" })).toEqual({
      baseUrl: VENTRATA_OCTO_BASE_URL,
      apiKey: "k",
      env: "test",
    });
    expect(bigBusOctoConfig({ BIGBUS_OCTO_ENABLED: "true", BIGBUS_OCTO_API_KEY: "k", BIGBUS_OCTO_ENV: "LIVE" })?.env).toBe("test");
    expect(bigBusOctoConfig({ BIGBUS_OCTO_ENABLED: "true", BIGBUS_OCTO_API_KEY: "k", BIGBUS_OCTO_ENV: "live" })?.env).toBe("live");
  });

  it("REQ-3324: rechaza una dirección que no sea https", () => {
    expect(
      bigBusOctoConfig({ BIGBUS_OCTO_ENABLED: "true", BIGBUS_OCTO_API_KEY: "k", BIGBUS_OCTO_BASE_URL: "http://x.test/octo" }),
    ).toBeNull();
  });
});

describe("octoHeaders", () => {
  it("REQ-3324: Bearer, Octo-Capabilities con precios y Octo-Env en cada llamada", () => {
    const h = octoHeaders({ baseUrl: VENTRATA_OCTO_BASE_URL, apiKey: "abc", env: "test" }, { json: true, language: "es" });
    expect(h).toEqual({
      Authorization: "Bearer abc",
      Accept: "application/json",
      "Octo-Capabilities": "octo/pricing",
      "Octo-Env": "test",
      "Content-Type": "application/json",
      "Accept-Language": "es",
    });
    expect(octoHeaders({ baseUrl: VENTRATA_OCTO_BASE_URL, apiKey: "abc", env: "live" })["Content-Type"]).toBeUndefined();
  });
});
