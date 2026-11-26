import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/tangol-sync.yml", "utf8");

/** El job a mano (`sync`) y el job diario (`diario`) del mismo workflow, por separado. */
const jobManual = wf.slice(0, wf.indexOf("\n  diario:"));
const jobDiario = wf.slice(wf.indexOf("\n  diario:"));

/**
 * REQ-10878 (reemplaza a REQ-3464 en lo del horario; plan de actualización diaria, etapa D2, G-D1 «1:00 a. m.»): el sync
 * de Tangol corre solo cada día a las 7:00 UTC (1:00 CDMX) SOLO con la variable de GitHub TANGOL_SYNC_DIARIO_ENABLED
 * en 'true'. El job a mano conserva los candados de REQ-3464: ensayo por omisión y escritura solo con la casilla.
 */
describe("REQ-10878: workflow «Tangol sync de tours»: job a mano con sus candados y job diario tras la variable", () => {
  it("REQ-10878: el horario es diario a las 7:00 UTC (1:00 CDMX, G-D1) y no hay disparo por push", () => {
    expect(wf).toMatch(/\non:\n[\s\S]*?\n {2}schedule:\n {4}- cron: "0 7 \* \* \*"/);
    expect(wf).toMatch(/\n {2}workflow_dispatch:/);
    expect(wf).not.toMatch(/\n {2}push:/);
  });

  it("REQ-10878: el job diario solo corre con schedule y TANGOL_SYNC_DIARIO_ENABLED == 'true'; el job a mano solo con workflow_dispatch", () => {
    expect(jobDiario).toMatch(/\n {2}diario:\n {4}if: github\.event_name == 'schedule' && vars\.TANGOL_SYNC_DIARIO_ENABLED == 'true'/);
    expect(jobManual).toMatch(/\n {2}sync:\n {4}if: github\.event_name == 'workflow_dispatch'/);
  });

  it("REQ-10878: el job diario hace bookmark de Time Travel antes de escribir, repite los lotes con el ciclo, pone slugs y termina con humo en producción; espera si hay un deploy", () => {
    const pasos = jobDiario.split(/\n {6}- /).slice(1).map((p) => p.split("\n")[0]);
    const i = (nombre: string) => pasos.findIndex((n) => n.includes(nombre));
    expect(i("Esperar a que no haya un deploy en curso")).toBeGreaterThan(i("Build de producción"));
    expect(i("Respaldo previo (instante de Time Travel)")).toBeGreaterThan(i("Esperar a que no haya un deploy en curso"));
    expect(i("Ciclo por lotes")).toBeGreaterThan(i("Respaldo previo (instante de Time Travel)"));
    expect(i("Slugs faltantes de Tangol (diario)")).toBeGreaterThan(i("Ciclo por lotes"));
    expect(i("Prueba de humo en producción (diario)")).toBeGreaterThan(i("Slugs faltantes de Tangol (diario)"));
    expect(jobDiario).toMatch(/npx tsx src\/scripts\/tangol-sync-diario\.ts/);
    expect(jobDiario).toMatch(/deploy-cloudflare\.yml --status in_progress/);
    expect(jobDiario).toMatch(/npx playwright install --with-deps chromium && npx tsx src\/scripts\/smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
    expect(jobDiario).toMatch(/timeout-minutes: 120/);
    expect(jobDiario).toMatch(/npx vitest run[\s\S]*npm run build/);
    // El ciclo recibe la pasarela y los canales del aviso (tope y tipo nuevo), nunca la bandera del sitio.
    expect(jobDiario).toMatch(/TANGOL_SYNC_ENABLED: "true"/);
    expect(jobDiario).toMatch(/MILA_AVISOS_SECRET: \$\{\{ secrets\.MILA_AVISOS_SECRET \}\}/);
    expect(jobDiario).not.toMatch(/TANGOL_ENABLED:/);
  });

  it("REQ-10878: los dos jobs comparten el candado de concurrencia datos-produccion", () => {
    expect(wf).toMatch(/concurrency: \{ group: datos-produccion, cancel-in-progress: false \}/);
  });

  it("REQ-3464 (candados que siguen, ahora bajo REQ-10878): en el job a mano la casilla de escritura viene APAGADA", () => {
    expect(jobManual).toMatch(/escribir:\n[\s\S]*?type: boolean\n\s+default: false/);
  });

  it("REQ-3464 (candados que siguen, ahora bajo REQ-10878): en el job a mano todo paso que escribe o prepara el SQL está detrás de la casilla", () => {
    const pasos = jobManual.split(/\n {6}- /).slice(1);
    const escriben = pasos.filter((p) => /--file|time-travel|--escribir/.test(p));
    expect(escriben.length).toBeGreaterThanOrEqual(3);
    for (const p of escriben) expect(p, p.split("\n")[0]).toMatch(/if: \$\{\{ inputs\.escribir \}\}/);
  });

  it("REQ-3464 (candados que siguen, ahora bajo REQ-10878): el ensayo corre sin la casilla y el export de D1 es solo SELECT", () => {
    expect(jobManual).toMatch(/if: \$\{\{ !inputs\.escribir \}\}/);
    const comandos = [...wf.matchAll(/--command '([^']+)/g)].map((m) => m[1].trim());
    expect(comandos.length).toBeGreaterThanOrEqual(3);
    for (const c of comandos) expect(c).toMatch(/^SELECT\b/);
  });

  it("REQ-3464 (candados que siguen, ahora bajo REQ-10878): antes de escribir corre la suite, el build y, al final, el humo en producción", () => {
    expect(jobManual).toMatch(/npx vitest run/);
    expect(jobManual).toMatch(/npm run build/);
    expect(jobManual).toMatch(/src\/scripts\/smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
  });

  it("REQ-1625: el workflow no toca la bandera del sitio (gate C)", () => {
    // La pasarela del sync va por su propia bandera; TANGOL_ENABLED gobierna lo que ve el público.
    expect(wf).toMatch(/TANGOL_SYNC_ENABLED: "true"/);
    expect(wf).not.toMatch(/TANGOL_ENABLED:/);
    // El valor de TANGOL_ENABLED en wrangler.jsonc lo vigila REQ-3506 (src/catalog/flag-tangol.test.ts).
  });

  it("REQ-3464 (candados que siguen, ahora bajo REQ-10878): el aviso de la migración 0026 está escrito en el workflow", () => {
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

// REQ-10876 / REQ-10877 (plan de actualización diaria, D1): el cierre de la corrida necesita la presencia de los tours de
// Tangol exportada en solo lectura, y el script la conecta al tope del 80 % y a «ocultar tras dos corridas» (G-D2).
describe("REQ-10877: el sync de Tangol exporta la presencia y el script cierra la corrida con tope y presencia", () => {
  const y = readFileSync(".github/workflows/tangol-sync.yml", "utf8");
  const script = readFileSync("src/scripts/tangol-sync.ts", "utf8");
  it("REQ-10877: el export de solo lectura trae externalId, syncStatus, missingRuns, isActive y lastSeenAt de los tours de Tangol", () => {
    const exportar = y.split(/\n {6}- /).find((p) => p.startsWith("name: Export de D1")) ?? "";
    expect(exportar).toMatch(/SELECT "externalId", "syncStatus", "missingRuns", "isActive", "lastSeenAt" FROM "Tour" WHERE "providerId" = '"'"'tangol'"'"'[\s\S]*tangol-tours\.json/);
  });
  it("REQ-10876: el script evalúa el tope al cerrar, avisa al PO y solo con --escribir agrega la presencia al SQL", () => {
    expect(script).toMatch(/report\.action === "finish"/);
    expect(script).toMatch(/planCierreTangol\(/);
    expect(script).toMatch(/avisarPO\(cierre\.aviso/);
    expect(script).toMatch(/if \(escribir && cierre\.updates\.length > 0\)/);
    expect(script).toMatch(/presenceStatements\(cierre\.updates, TANGOL_PROVIDER_ID\)/);
  });
});

describe("REQ-10944: TourOption (0036) solo con TANGOL_OPTIONS_TABLE_ON", () => {
  it("REQ-10944: los tres pasos que corren el sync pasan TANGOL_OPTIONS_TABLE_ON desde el var del repo, apagado por omisión", () => {
    const pasos = wf.match(/TANGOL_OPTIONS_TABLE_ON: \$\{\{ vars\.TANGOL_OPTIONS_TABLE_ON \|\| 'false' \}\}/g) ?? [];
    expect(pasos).toHaveLength(3);
    expect(jobManual.match(/TANGOL_OPTIONS_TABLE_ON: /g)).toHaveLength(2);
    expect(jobDiario.match(/TANGOL_OPTIONS_TABLE_ON: /g)).toHaveLength(1);
  });
});
