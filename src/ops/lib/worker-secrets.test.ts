import { describe, it, expect } from "vitest";
import { armarSecretos, nombresDeSecretos } from "./worker-secrets";

const env = {
  FREETOUR_EMAIL: "correo",
  FREETOUR_PASSWORD: "clave",
  GATEWAY_SECRET: "gw",
  RESEND_API_KEY: "",
  BANXICO_TOKEN: undefined,
};

describe("secretos que viajan con la versión (INC-006)", () => {
  it("REQ-155: incluye las credenciales de GitHub que tienen valor y omite las vacías", () => {
    const { secretos } = armarSecretos({ env, existentes: ["CRON_SECRET", "AUTH_SECRET"], generar: () => "x" });
    expect(Object.keys(secretos).sort()).toEqual(["FREETOUR_EMAIL", "FREETOUR_PASSWORD", "GATEWAY_SECRET"]);
    expect(secretos.FREETOUR_PASSWORD).toBe("clave");
  });

  it("REQ-155: las claves internas existentes se conservan (no se regeneran ni se reenvían)", () => {
    const { secretos, generados } = armarSecretos({ env, existentes: ["CRON_SECRET", "AUTH_SECRET"], generar: () => "nuevo" });
    expect(secretos.CRON_SECRET).toBeUndefined();
    expect(secretos.AUTH_SECRET).toBeUndefined();
    expect(generados).toEqual([]);
  });

  it("REQ-155: una clave interna que falta se genera una sola vez", () => {
    const { secretos, generados } = armarSecretos({ env, existentes: ["CRON_SECRET"], generar: () => "nuevo" });
    expect(secretos.AUTH_SECRET).toBe("nuevo");
    expect(generados).toEqual(["AUTH_SECRET"]);
  });

  it("REQ-155: la lista de secretos del Worker se lee del JSON de wrangler", () => {
    expect(nombresDeSecretos('[{"name":"CRON_SECRET","type":"secret_text"},{"name":"AUTH_SECRET","type":"secret_text"}]')).toEqual([
      "CRON_SECRET",
      "AUTH_SECRET",
    ]);
    expect(nombresDeSecretos(' ⛅️ wrangler 4.155.0\n[{"name":"AUTH_SECRET","type":"secret_text"}]\n')).toEqual(["AUTH_SECRET"]);
    expect(nombresDeSecretos("[]")).toEqual([]);
  });

  it("REQ-155: si la lista no se puede leer, falla (antes caía a «[]» y habría regenerado AUTH_SECRET y CRON_SECRET)", () => {
    expect(() => nombresDeSecretos("")).toThrow();
    expect(() => nombresDeSecretos("✘ [ERROR] A request to the Cloudflare API failed")).toThrow();
    expect(() => nombresDeSecretos('{"error":1}')).toThrow();
  });
});
