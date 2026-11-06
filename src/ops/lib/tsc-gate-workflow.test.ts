// REQ-224 (INC-001, acción correctiva): `tsc --noEmit` es un gate en la prueba de humo del PR y en el deploy.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

type Step = { name?: string; run?: string; if?: string };
const pasos = (file: string, job: string): Step[] =>
  (parse(readFileSync(file, "utf8")) as { jobs: Record<string, { steps: Step[] }> }).jobs[job].steps;
const idx = (steps: Step[], re: RegExp) => steps.findIndex((s) => re.test(s.run ?? ""));

describe.each([
  [".github/workflows/prueba-humo.yml", "smoke"],
  [".github/workflows/deploy-cloudflare.yml", "deploy"],
])("%s", (file, job) => {
  const steps = pasos(file, job);
  const tsc = idx(steps, /^npx tsc --noEmit\s*$/);

  it("REQ-224: corre `tsc --noEmit` sin condición (un error de tipos detiene el workflow)", () => {
    expect(tsc).toBeGreaterThanOrEqual(0);
    expect(steps[tsc].if).toBeUndefined();
  });

  it("REQ-224: va después de la lista de países y de Prisma (los tipos los necesitan) y antes de construir y subir", () => {
    expect(tsc).toBeGreaterThan(idx(steps, /countries:generate/));
    expect(tsc).toBeGreaterThan(idx(steps, /prisma generate/));
    expect(tsc).toBeLessThan(idx(steps, /opennextjs-cloudflare build/));
    expect(tsc).toBeLessThan(idx(steps, /opennextjs-cloudflare upload/));
  });
});

it("REQ-224: en el deploy, `tsc` corre antes de las migraciones de D1", () => {
  const steps = pasos(".github/workflows/deploy-cloudflare.yml", "deploy");
  const tsc = idx(steps, /^npx tsc --noEmit\s*$/);
  expect(tsc).toBeGreaterThanOrEqual(0);
  expect(tsc).toBeLessThan(idx(steps, /d1 migrations apply/));
});
