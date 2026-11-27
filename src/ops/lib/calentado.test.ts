// REQ-10868 (INC-028, corrección A del PO, 26-11-2026): calentado completo y humo que mide HTML y recursos por separado.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CALENTADO, guiasDelDia, HTML_TIMEOUT_MS, paginasACalentar, RESOURCE_WAIT_MS } from "./calentado";

const guias = [
  { pais: "pe", ciudad: "huaraz", publishedAt: "2026-11-26", en: { titulo: "Huaraz guide" } },
  { pais: "co", ciudad: "pereira", publishedAt: "2026-11-26" },
  { pais: "cl", ciudad: "iquique", publishedAt: "2026-11-25", en: { titulo: "x" } },
];

describe("REQ-10868: qué se calienta antes del humo de producción", () => {
  it("REQ-10868: las guías publicadas hoy entran (y su /en si existe); las de otros días no", () => {
    expect(guiasDelDia(guias, "2026-11-26")).toEqual(["/destinos/pe/huaraz", "/en/destinos/pe/huaraz", "/destinos/co/pereira"]);
    expect(guiasDelDia(guias, "2026-11-27")).toEqual([]);
  });

  it("REQ-10868: la lista son todas las fijas de pages.json (en su orden) más las guías del día, sin repetidos y con «/en» sin barra", () => {
    const fijas = (JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")) as { fixed: string[] }).fixed;
    const lista = paginasACalentar(fijas, guiasDelDia(guias, "2026-11-26"));
    expect(lista.slice(0, fijas.length).map((p) => (p.length > 1 ? p.replace(/\/+$/, "") : p))).toEqual(fijas.map((p) => (p.length > 1 ? p.replace(/\/+$/, "") : p)));
    expect(lista).toContain("/destinos/pe/huaraz");
    expect(new Set(lista).size).toBe(lista.length);
    expect(paginasACalentar(["/en/", "/", "/en"], ["/en"])).toEqual(["/en", "/"]);
    expect(CALENTADO.intentos).toBeGreaterThanOrEqual(2);
  });

  it("REQ-10868: el humo mide el HTML (domcontentloaded, 90 s) aparte de los recursos (networkidle con tope corto que no tumba la carga)", () => {
    const smoke = readFileSync("src/scripts/smoke.ts", "utf8");
    expect(HTML_TIMEOUT_MS).toBe(90_000);
    expect(RESOURCE_WAIT_MS).toBeLessThanOrEqual(30_000);
    expect(smoke).toMatch(/waitUntil: "domcontentloaded", timeout: HTML_TIMEOUT_MS/);
    expect(smoke).toMatch(/waitForLoadState\("networkidle", \{ timeout: RESOURCE_WAIT_MS \}\)\.then\(\(\) => true\)\.catch\(\(\) => false\)/);
    // Un 5xx o una página en blanco siguen contando: el veredicto sigue mirando status y pantalla de error.
    expect(smoke).toMatch(/status: res\?\.status\(\) \?\? null, pageErrors, appError/);
  });

  it("REQ-10868: el deploy calienta con calentar-paginas.ts antes del humo de producción, sin tumbar el job", () => {
    const steps = (parse(readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8")) as { jobs: Record<string, { steps: { name?: string; run?: string; "continue-on-error"?: boolean }[] }> }).jobs.deploy.steps;
    const i = steps.findIndex((s) => s.name === "Calentar la caché de producción (INC-009)");
    const j = steps.findIndex((s) => s.name === "Prueba de humo (producción)");
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    expect(steps[i].run).toMatch(/calentar-paginas\.ts https:\/\/travelpuzzle\.com\.mx/);
    expect(steps[i]["continue-on-error"]).toBe(true);
  });
});
