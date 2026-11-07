import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSmokeConfig } from "./smoke";

// REQ-1266: el «404» de /destinos/gb/edimburgo/top-edimburgo-experiencia-auto-guia era un falso positivo:
// la URL real es …-auto-guiada-por-aplicacion; el stream RSC parte la cadena entre dos <script>
// ("…auto-guia"])</script><script>self.__next_f.push([1,"da-por-aplicacion…") y un rastreador que lee
// el payload como HTML la corta. El humo lee los href del DOM (a[href]) y ahora cubre GB/Edimburgo.
const config = parseSmokeConfig(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")));

describe("REQ-1266: humo cubre GB y las fichas reales de Edimburgo", () => {
  it("las páginas de país y ciudad de GB son fijas", () => {
    expect(config.fixed).toEqual(expect.arrayContaining(["/destinos/gb", "/destinos/gb/edimburgo"]));
  });
  it("descubre una ficha real de Edimburgo desde el DOM de la ciudad (obligatoria)", () => {
    const rule = config.discover.find((r) => r.from === "/destinos/gb/edimburgo");
    expect(rule).toBeDefined();
    expect(rule!.required).toBe(true);
    const re = new RegExp(rule!.pattern);
    expect(re.test("/destinos/gb/edimburgo/top-edimburgo-experiencia-auto-guiada-por-aplicacion")).toBe(true);
    expect(re.test("/destinos/mx/ciudad-de-mexico/x")).toBe(false);
  });
});
