// REQ-3515: el workflow «Actualizar PR en conflicto» nunca fuerza un push, solo corre con su secreto y no se encima.
// npx vitest run src/ops/actualizar-prs-workflow.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/actualizar-prs.yml", "utf8");
const script = readFileSync("src/scripts/actualizar-prs.ts", "utf8");

describe("REQ-3515: actualizar PR en conflicto con seguridad", () => {
  it("REQ-3515: ni el workflow ni el script hacen force-push", () => {
    expect(wf + script).not.toMatch(/--force|\s-f\s|force-with-lease|\+refs\//);
  });
  it("REQ-3515: sin el secreto PR_SYNC_TOKEN no hace nada (con GITHUB_TOKEN el humo del PR no correría)", () => {
    expect(wf).toMatch(/T: \$\{\{ secrets\.PR_SYNC_TOKEN \}\}/);
    expect(wf).toMatch(/if \[ -z "\$T" \]; then\n\s+echo "listo=false"/);
    for (const paso of ["uses: actions/checkout", "run: npm ci", "name: Actualizar los PR"]) {
      const i = wf.indexOf(paso);
      expect(i).toBeGreaterThan(0);
      expect(wf.slice(Math.max(0, i - 120), i + 200)).toMatch(/if: steps\.token\.outputs\.listo == 'true'/);
    }
    expect(wf).not.toMatch(/secrets\.GITHUB_TOKEN|github\.token/);
  });
  it("REQ-3515: una corrida a la vez, sin cancelar la que va en curso", () => {
    expect(wf).toMatch(/concurrency:\n\s+group: actualizar-prs\n\s+cancel-in-progress: false/);
  });
  it("REQ-3515: a mano arranca en ensayo (sin push) por omisión", () => {
    expect(wf).toMatch(/ensayo:[\s\S]*?default: true/);
    expect(script).toMatch(/!ensayo && !gitOk\("push"/);
  });
  it("REQ-3515: solo toca PR en «dirty» y respeta la etiqueta no-actualizar", () => {
    expect(script).toMatch(/mergeable_state !== "dirty"\) continue/);
    expect(script).toMatch(/l\.name === "no-actualizar"/);
  });
});
