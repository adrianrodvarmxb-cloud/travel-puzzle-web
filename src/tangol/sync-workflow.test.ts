import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/tangol-sync.yml", "utf8");
const wrangler = readFileSync("wrangler.jsonc", "utf8");

/**
 * REQ-3464: el sync de Tangol NO corre solo. Estas pruebas vigilan el disparo a mano, el ensayo por
 * omisión y los candados; si alguien le pone un `schedule` o adelanta la escritura, se cae aquí.
 */
describe("REQ-3464: workflow «Tangol sync de tours (a mano)»", () => {
  it("REQ-3464: solo se dispara a mano: no tiene schedule ni push", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:/);
    expect(wf).not.toMatch(/\n {2}schedule:/);
    expect(wf).not.toMatch(/\n {2}push:/);
  });

  it("REQ-3464: la casilla de escritura existe y viene APAGADA, como en los otros workflows de datos", () => {
    expect(wf).toMatch(/escribir:\n[\s\S]*?type: boolean\n\s+default: false/);
  });

  it("REQ-3464: todo paso que escribe o que prepara el SQL está detrás de la casilla", () => {
    const pasos = wf.split(/\n {6}- /).slice(1);
    const escriben = pasos.filter((p) => /--file|time-travel|--escribir/.test(p));
    expect(escriben.length).toBeGreaterThanOrEqual(3);
    for (const p of escriben) expect(p, p.split("\n")[0]).toMatch(/if: \$\{\{ inputs\.escribir \}\}/);
  });

  it("REQ-3464: el ensayo corre sin la casilla y el export de D1 es solo SELECT", () => {
    expect(wf).toMatch(/if: \$\{\{ !inputs\.escribir \}\}/);
    const comandos = [...wf.matchAll(/--command '([^']+)/g)].map((m) => m[1].trim());
    expect(comandos.length).toBeGreaterThanOrEqual(3);
    for (const c of comandos) expect(c).toMatch(/^SELECT\b/);
  });

  it("REQ-3464: antes de escribir corre la suite, el build y, al final, el humo en producción", () => {
    expect(wf).toMatch(/npx vitest run/);
    expect(wf).toMatch(/npm run build/);
    expect(wf).toMatch(/src\/scripts\/smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
  });

  it("REQ-1625: el workflow no toca la bandera del sitio, que sigue apagada (gate C)", () => {
    // La pasarela del sync va por su propia bandera; TANGOL_ENABLED gobierna lo que ve el público.
    expect(wf).toMatch(/TANGOL_SYNC_ENABLED: "true"/);
    expect(wf).not.toMatch(/TANGOL_ENABLED:/);
    expect(wrangler).toMatch(/"TANGOL_ENABLED":\s*"false"/);
  });

  it("REQ-3464: el aviso de la migración 0026 está escrito en el workflow", () => {
    expect(wf).toMatch(/0026/);
    expect(wf).toMatch(/UNIQUE/);
  });
});
