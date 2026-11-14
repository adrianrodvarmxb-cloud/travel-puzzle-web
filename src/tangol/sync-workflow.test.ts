import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/tangol-sync.yml", "utf8");

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

  it("REQ-1625: el workflow no toca la bandera del sitio (gate C)", () => {
    // La pasarela del sync va por su propia bandera; TANGOL_ENABLED gobierna lo que ve el público.
    expect(wf).toMatch(/TANGOL_SYNC_ENABLED: "true"/);
    expect(wf).not.toMatch(/TANGOL_ENABLED:/);
    // El valor de TANGOL_ENABLED en wrangler.jsonc lo vigila REQ-3506 (src/catalog/flag-tangol.test.ts).
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
 * REQ-3539 (13-11, runs 43475677142 y 43477829263): los lotes escribieron bien, pero la prueba de humo final
 * cayó porque el runner no tenía el navegador de Playwright.
 */
describe("REQ-3539: el humo del sync de Tangol tiene navegador", () => {
  it("REQ-3539: el paso de humo instala Chromium antes de correr smoke.ts", () => {
    const humo = wf.split(/\n {6}- /).find((p) => p.startsWith("name: Prueba de humo en producción")) ?? "";
    expect(humo).toMatch(/npx playwright install --with-deps chromium[\s\S]*src\/scripts\/smoke\.ts/);
  });
});

// REQ-3536: la carga real con lotes de 60 destinos necesita más de 30 min (corrida 43466215988 cancelada en la copia a R2).
describe("REQ-3536: el sync de Tangol tiene tiempo para un lote de 60 destinos", () => {
  it("REQ-3536: timeout-minutes de al menos 120", () => {
    const y = readFileSync(".github/workflows/tangol-sync.yml", "utf8");
    expect(Number(y.match(/timeout-minutes:\s*(\d+)/)?.[1])).toBeGreaterThanOrEqual(120);
  });
});

// REQ-10509: los tours de Tangol reciben slug en el mismo workflow, después de escribir y antes del humo.
describe("REQ-10509: paso de slugs faltantes en el sync de Tangol", () => {
  const y = readFileSync(".github/workflows/tangol-sync.yml", "utf8");
  it("REQ-10509: existe, solo con escribir=true, y va entre «Escribir en D1» y el humo", () => {
    const i = y.indexOf("name: Escribir en D1"), s = y.indexOf("name: Slugs faltantes de Tangol"), h = y.indexOf("name: Prueba de humo en producción");
    expect(i).toBeGreaterThan(0); expect(s).toBeGreaterThan(i); expect(h).toBeGreaterThan(s);
    expect(y.slice(s, h)).toMatch(/if: \$\{\{ inputs\.escribir \}\}/);
    expect(y.slice(s, h)).toMatch(/tangol-slugs\.ts/);
    expect(y.slice(s, h)).toMatch(/"slug" IS NULL/);
  });

  it("REQ-10510: la casilla «moneda» existe con USD por omisión y llega al script en el ensayo y en el plan de escritura", () => {
    const wf = y;
    const pasos = wf.split(/\n {6}- /).slice(1);
    expect(wf).toMatch(/moneda:\n\s+description: .*\n\s+required: false\n\s+default: "USD"/);
    const corren = pasos.filter((p) => p.includes("src/scripts/tangol-sync.ts"));
    expect(corren).toHaveLength(2);
    for (const p of corren) expect(p).toMatch(/TANGOL_RATES_CURRENCY: \$\{\{ inputs\.moneda \|\| 'USD' \}\}/);
  });
});
