// REQ-1520: el workflow que escribe la dificultad revisada. npx vitest run src/ops/dificultad-viajes-workflow.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/dificultad-viajes.yml", "utf8");
const pos = (n: string) => wf.indexOf(`- name: ${n}`);

describe("REQ-1520: workflow «Dificultad de viajes»", () => {
  it("solo a mano, ensayo por omisión y en la fila de datos de producción", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:\n/);
    expect(wf).not.toMatch(/\n {2}(push|pull_request|schedule):/);
    expect(wf).toMatch(/ {6}escribir:\n.*\n {8}type: boolean\n {8}default: false/);
    expect(wf).toMatch(/concurrency: \{ group: datos-produccion, cancel-in-progress: false \}/);
  });
  it("antes de escribir: confirmación exacta, plan, respaldo, sin deploy en curso y bookmark de Time Travel", () => {
    expect(wf).toContain('[ "$CONFIRMAR" = "DIFICULTAD $ESPERADOS" ]');
    const orden = ["Confirmación", "Plan (ensayo)", "Respaldo (artefacto privado del job)", "Sin publicación ni importación en curso (REQ-307)", "Bookmark de Time Travel", "Escribir (UPDATE por id)", "Verificar en D1", "Prueba de humo en producción"].map(pos);
    for (const p of orden) expect(p).toBeGreaterThan(0);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });
  it("cada paso que escribe va con escribir=true; el SQL solo trae UPDATE de difficultyLevel por id; hay regreso", () => {
    for (const n of ["Bookmark de Time Travel", "Escribir (UPDATE por id)", "Verificar en D1", "Prueba de humo en producción"]) {
      expect(wf.slice(pos(n), pos(n) + 200)).toMatch(/if: inputs\.escribir/);
    }
    expect(wf).toContain(`grep -vE "^(UPDATE \\"Trip\\" SET \\"difficultyLevel\\" = ([1-5]|NULL) WHERE \\"id\\" = '[a-z0-9-]+';|)$"`);
    expect(wf).toMatch(/if: failure\(\) && steps\.escribir\.outputs\.escrito == 'true'\n\s+run: \|\n\s+npx wrangler d1 execute "\$DB" --remote --file dif\/regreso\.sql/);
  });
});
