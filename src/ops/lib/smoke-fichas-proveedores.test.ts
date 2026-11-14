import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSmokeConfig } from "./smoke";

// REQ-10647: antes de cambiar la ficha (plan docs/plan-ficha-unica-2026-11.md, ola 0) el humo debe cubrir
// una ficha de Tangol en español y en inglés y un tour de pago de FREETOUR. Hasta hoy no cubría ninguna.
const config = parseSmokeConfig(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")));
const TANGOL = "/destinos/ar/el-calafate/minitrekking-glaciar-perito-moreno";
const FREETOUR_PAGO = "/destinos/co/medellin/tour-comuna-trece-con-guias-locales-reales";

describe("REQ-10647: el humo cubre fichas de Tangol y un FREETOUR de pago", () => {
  it("REQ-10647: la ficha de Tangol es fija en español y en inglés", () => {
    expect(config.fixed).toEqual(expect.arrayContaining([TANGOL, "/en" + TANGOL]));
  });
  it("REQ-10647: el tour de pago de FREETOUR es fijo", () => {
    expect(config.fixed).toContain(FREETOUR_PAGO);
  });
  it("REQ-10647: descubre otra ficha real de Tangol desde su ciudad (obligatoria)", () => {
    const rule = config.discover.find((r) => r.from === "/destinos/ar/el-calafate");
    expect(rule).toBeDefined();
    expect(rule!.required).toBe(true);
    const re = new RegExp(rule!.pattern);
    expect(re.test("/destinos/ar/el-calafate/astroturismo")).toBe(true);
    expect(re.test("/destinos/gb/edimburgo/x")).toBe(false);
  });
});
