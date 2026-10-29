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
