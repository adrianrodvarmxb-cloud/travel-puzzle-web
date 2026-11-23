import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

type Step = { name?: string; run?: string; "continue-on-error"?: boolean };
const pr = (parse(readFileSync(".github/workflows/prueba-humo.yml", "utf8")) as { jobs: Record<string, { steps: Step[] }> }).jobs.smoke.steps;
const NOMBRE = "Imágenes fuera de pantalla (REQ-1564)";

describe("REQ-1564: la prueba Playwright de imágenes fuera de pantalla corre en cada PR", () => {
  it("REQ-1564: el humo del PR corre offscreen-images.ts contra la versión subida, después de la prueba de humo", () => {
    const i = pr.findIndex((s) => s.name === NOMBRE);
    expect(i).toBeGreaterThan(-1);
    expect(pr[i].run).toMatch(/npx tsx src\/scripts\/offscreen-images\.ts "\$\{\{ steps\.version\.outputs\.url \}\}"/);
    expect(i).toBeGreaterThan(pr.findIndex((s) => s.name === "Prueba de humo"));
  });

  it("REQ-1564: revisa home, /tours, una ficha de /viajes y una de /destinos", () => {
    const run = pr.find((s) => s.name === NOMBRE)?.run ?? "";
    for (const ruta of [" / ", " /tours ", " /viajes/", " /destinos/"]) expect(run).toContain(ruta);
  });

  it("REQ-1564: bloquea como el humo (no es opcional)", () => {
    expect(pr.find((s) => s.name === NOMBRE)?.["continue-on-error"]).toBeUndefined();
  });
});
