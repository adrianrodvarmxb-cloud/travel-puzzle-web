import { describe, it, expect } from "vitest";
import { checkConfig } from "./config.js";

const env = { GATEWAY_SECRET: "s", FREETOUR_EMAIL: "e", FREETOUR_PASSWORD: "p", FREETOUR_LOCAL_ADDRESS: "66.29.153.81" };

describe("checkConfig", () => {
  it("todo puesto: sin errores", () => {
    expect(checkConfig(env)).toEqual([]);
  });
  it("la IP de salida es obligatoria", () => {
    expect(checkConfig({ ...env, FREETOUR_LOCAL_ADDRESS: "" })).toEqual(["falta FREETOUR_LOCAL_ADDRESS"]);
  });
  it("la IP de salida debe ser una IP", () => {
    expect(checkConfig({ ...env, FREETOUR_LOCAL_ADDRESS: "pasarela.travelpuzzle.com.mx" })).toEqual(["FREETOUR_LOCAL_ADDRESS no es una IP"]);
  });
  it("lista todo lo que falta", () => {
    expect(checkConfig({})).toHaveLength(4);
  });
});
