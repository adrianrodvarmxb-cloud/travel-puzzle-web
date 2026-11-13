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

describe("REQ-3519: el sync de Tangol guarda la copia exacta en R2 privado al escribir", () => {
  const pasos = wf.split(/\n {6}- /).slice(1);
  const paso = (nombre: string) => pasos.find((p) => p.split("\n")[0].includes(nombre)) ?? "";

  it("REQ-3519: el export de solo lectura trae lo que ya está archivado de Tangol", () => {
    expect(paso("Export de D1")).toMatch(/FROM "ProviderRecord" WHERE "provider" = '"'"'tangol'"'"'[\s\S]*provider-record\.json/);
  });

  it("REQ-3519: solo el plan de escritura arma la copia, en una carpeta FUERA del artefacto público", () => {
    expect(paso("Plan de escritura")).toMatch(/--copia tmp\/tangol-copia/);
    expect(paso("Ensayo")).not.toMatch(/--copia/);
    expect(wf).toMatch(/path: tmp\/tangol-salida/);
    expect(wf).not.toMatch(/path: tmp\/tangol-copia/);
  });

  it("REQ-3519: sube los objetos al bucket PRIVADO y aplica el índice solo si la subida salió bien", () => {
    const subir = paso("Copia exacta a R2");
    expect(subir).toMatch(/if: \$\{\{ inputs\.escribir \}\}/);
    expect(subir).toMatch(/r2 object put "travel-puzzle-raw\//);
    expect(subir).toMatch(/--remote/);
    expect(subir).toMatch(/continue-on-error: true/);
    const indice = paso("Índice de la copia");
    expect(indice).toMatch(/if: \$\{\{ inputs\.escribir \}\}/);
    expect(indice).toMatch(/COPIA: \$\{\{ steps\.copia\.outcome \}\}/);
    expect(indice).toMatch(/\[ "\$COPIA" = "success" \]/);
    expect(indice).toMatch(/provider-record\.sql/);
    expect(pasos.indexOf(subir)).toBeLessThan(pasos.indexOf(paso("Escribir en D1")));
  });
});

/**
 * REQ-3539 (13-11, run 43475677142): el lote 1 escribió bien, pero la prueba de humo final cayó porque el
 * runner no tenía el navegador de Playwright. Y el run 43466215988 (lote 60) se cortó por el límite de 30 min.
 */
describe("REQ-3539: la corrida de escritura de Tangol cabe en el tiempo y su humo tiene navegador", () => {
  it("REQ-3539: el paso de humo instala Chromium antes de correr smoke.ts", () => {
    const humo = wf.split(/\n {6}- /).find((p) => p.startsWith("name: Prueba de humo en producción")) ?? "";
    expect(humo).toMatch(/npx playwright install --with-deps chromium[\s\S]*src\/scripts\/smoke\.ts/);
  });

  it("REQ-3539: el job tiene margen para plan + copia exacta + escritura (60 min o más)", () => {
    const m = wf.match(/timeout-minutes: (\d+)/);
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(60);
  });
});
