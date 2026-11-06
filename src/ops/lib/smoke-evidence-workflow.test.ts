import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

type Step = { name?: string; id?: string; if?: string; run?: string; uses?: string; env?: Record<string, string>; with?: Record<string, unknown>; "continue-on-error"?: boolean };
const load = (f: string, job: string) => (parse(readFileSync(f, "utf8")) as { jobs: Record<string, { steps: Step[] }> }).jobs[job].steps;
const deploy = load(".github/workflows/deploy-cloudflare.yml", "deploy");
const pr = load(".github/workflows/prueba-humo.yml", "smoke");
const paso = (steps: Step[], nombre: string) => {
  const s = steps.find((x) => x.name === nombre);
  if (!s) throw new Error(`falta el paso «${nombre}»`);
  return s;
};

describe("REQ-500 (INC-007): la evidencia de la prueba de humo queda como artefacto del job", () => {
  it("REQ-500: en el deploy, cada prueba de humo guarda su evidencia en su propia carpeta", () => {
    expect(paso(deploy, "Prueba de humo (antes de publicar)").env?.SMOKE_EVIDENCE_DIR).toBe("smoke-evidencia/antes-de-publicar");
    expect(paso(deploy, "Prueba de humo (producción)").env?.SMOKE_EVIDENCE_DIR).toBe("smoke-evidencia/produccion");
  });

  it("REQ-500: el deploy sube la evidencia siempre (también si falló o se regresó), al final del job", () => {
    const s = paso(deploy, "Evidencia de la prueba de humo");
    expect(s.uses).toMatch(/^actions\/upload-artifact@v\d+$/);
    expect(s.if).toMatch(/always\(\)/);
    expect(s.with).toMatchObject({ path: "smoke-evidencia/", "if-no-files-found": "ignore" });
    expect(deploy.indexOf(s)).toBe(deploy.length - 1);
  });

  it("REQ-500: el PR también sube su evidencia siempre", () => {
    expect(paso(pr, "Prueba de humo").env?.SMOKE_EVIDENCE_DIR).toBe("smoke-evidencia/pr");
    const s = paso(pr, "Evidencia de la prueba de humo");
    expect(s.uses).toMatch(/^actions\/upload-artifact@v\d+$/);
    expect(s.if).toMatch(/always\(\)/);
    expect(s.with).toMatchObject({ path: "smoke-evidencia/", "if-no-files-found": "ignore" });
  });

  it("REQ-500: la prueba de humo sigue bloqueando: ningún paso de humo antes de publicar se vuelve opcional", () => {
    expect(paso(deploy, "Prueba de humo (antes de publicar)")["continue-on-error"]).toBeUndefined();
    expect(paso(pr, "Prueba de humo")["continue-on-error"]).toBeUndefined();
    // En producción ya era continue-on-error para que corra el regreso; el regreso sigue terminando en rojo.
    expect(paso(deploy, "Regresar a la versión anterior si falló").run).toMatch(/exit 1/);
  });
});
