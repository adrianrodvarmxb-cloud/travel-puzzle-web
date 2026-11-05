import { describe, it, expect } from "vitest";
import { FREETOUR_HOSTS, resolveFreetourConfig } from "./hosts";

describe("resolveFreetourConfig", () => {
  const creds = { FREETOUR_EMAIL: "e@x.com", FREETOUR_PASSWORD: "p" };

  it("usa stage por defecto", () => {
    expect(resolveFreetourConfig(creds).baseUrl).toBe(FREETOUR_HOSTS.stage);
  });

  it("usa producción solo si FREETOUR_ENV=production", () => {
    const cfg = resolveFreetourConfig({ ...creds, FREETOUR_ENV: "production" });
    expect(cfg.environment).toBe("production");
    expect(cfg.baseUrl).toBe(FREETOUR_HOSTS.production);
  });

  it("cualquier otro valor cae en stage", () => {
    expect(resolveFreetourConfig({ ...creds, FREETOUR_ENV: "prod" }).environment).toBe("stage");
  });

  it("exige credenciales", () => {
    expect(() => resolveFreetourConfig({})).toThrow(/FREETOUR_EMAIL/);
    expect(() => resolveFreetourConfig({ FREETOUR_EMAIL: "e" })).toThrow(/FREETOUR_PASSWORD/);
  });
});

// REQ-062: interruptor de versión de la API (2.0 por defecto; regreso inmediato quitando la variable)
describe("REQ-062 FREETOUR_API_VERSION", () => {
  const creds = { FREETOUR_EMAIL: "e@x.com", FREETOUR_PASSWORD: "p", FREETOUR_ENV: "production" };
  it("REQ-062: sin variable sigue en v.2.0 (nada cambia)", () => {
    expect(resolveFreetourConfig(creds).baseUrl).toBe("https://secure.freetour.com/partnersAPI/v.2.0");
    expect(resolveFreetourConfig(creds).apiVersion).toBe("2.0");
  });
  it("REQ-062: 2.2 cambia la ruta en producción y en stage", () => {
    expect(resolveFreetourConfig({ ...creds, FREETOUR_API_VERSION: "2.2" }).baseUrl).toBe("https://secure.freetour.com/partnersAPI/v.2.2");
    expect(resolveFreetourConfig({ FREETOUR_EMAIL: "e", FREETOUR_PASSWORD: "p", FREETOUR_API_VERSION: "2.2" }).baseUrl).toBe("https://stage.freetour.dev/partnersAPI/v.2.2");
  });
  it("REQ-062: un valor desconocido no rompe: se queda en 2.0", () => {
    expect(resolveFreetourConfig({ ...creds, FREETOUR_API_VERSION: "9.9" }).apiVersion).toBe("2.0");
    expect(resolveFreetourConfig({ ...creds, FREETOUR_API_VERSION: " 2.2 " }).apiVersion).toBe("2.2");
  });
});
