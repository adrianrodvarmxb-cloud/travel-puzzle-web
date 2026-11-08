import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

describe("REQ-767 script de respaldo retroactivo: ensayo por omisión, nunca sube nada", () => {
  const src = readFileSync("src/scripts/raw-backfill.ts", "utf8");
  it("REQ-767 no llama a R2 ni a D1: solo escribe subir.sh para que el PO lo corra", () => {
    expect(src).not.toMatch(/execFileSync\(\s*"(npx|wrangler)"/);
    expect(src).not.toMatch(/fetch\(/);
    expect(src).toMatch(/NO correr sin OK del PO/);
  });
  it("REQ-767 se niega a escribir la copia exacta dentro del repo (salvo tmp/, ignorado por git)", () => {
    let out = "";
    try { execFileSync("npx", ["tsx", "src/scripts/raw-backfill.ts", "--salida", "imports/no"], { encoding: "utf8", stdio: "pipe" }); }
    catch (e) { out = String((e as { stdout?: string }).stdout ?? ""); }
    expect(out).toMatch(/dentro del repo/);
  }, 60_000);
});

describe("REQ-768 workflow de respaldo: ensayo por omisión y candados", () => {
  const wf = readFileSync(".github/workflows/respaldo-crudo.yml", "utf8");
  it("REQ-768 solo se dispara a mano, escribir es false por omisión y el contrato va primero", () => {
    expect(wf).toMatch(/on:\s*\n\s*workflow_dispatch:/);
    expect(wf).not.toMatch(/\n\s*push:|\n\s*schedule:/);
    expect(wf).toMatch(/escribir:[\s\S]*?default: false/);
    expect(wf.indexOf("ingest-contract.ts")).toBeLessThan(wf.indexOf("raw-backfill.ts"));
  });
  it("REQ-768 subir exige escribir=true y RAW_ARCHIVE_ENABLED=\"true\" en wrangler.jsonc", () => {
    expect(wf).toMatch(/if: \$\{\{ inputs\.escribir && steps\.crudo\.outputs\.on == 'true' \}\}\s*\n\s*run: bash tmp\/crudo\/subir\.sh/);
    expect(wf).not.toMatch(/upload-artifact/); // la copia exacta lleva netos: nunca como artefacto
  });
});

describe("REQ-775 respaldo retroactivo blindado: nunca a la par de un deploy o una importación, con respaldo y verificación", () => {
  const wf = readFileSync(".github/workflows/respaldo-crudo.yml", "utf8");
  const paso = (nombre: string) => {
    const i = wf.indexOf(`- name: ${nombre}`);
    expect(i, nombre).toBeGreaterThan(0);
    const j = wf.indexOf("\n      - ", i + 1);
    return wf.slice(i, j < 0 ? undefined : j);
  };
  const escribe = "if: ${{ inputs.escribir && steps.crudo.outputs.on == 'true' }}";
  it("REQ-775 una corrida a la vez en la fila de datos de producción", () => {
    expect(wf).toMatch(/concurrency: \{ group: datos-produccion, cancel-in-progress: false \}/);
  });
  it("REQ-775 antes de subir: sin publicación ni importación en curso o en fila (REQ-307)", () => {
    const p = paso("Sin publicación ni importación en curso");
    expect(p).toContain(escribe);
    expect(p).toMatch(/deploy-cloudflare\.yml importar-viajes\.yml/);
    expect(p).toMatch(/for st in in_progress queued/);
    expect(wf.indexOf("Sin publicación ni importación en curso")).toBeLessThan(wf.indexOf("name: Subir a R2 privado + índice"));
  });
  it("REQ-775 antes de subir: anota el bookmark de Time Travel de D1 o no escribe", () => {
    const p = paso("Respaldo previo (instante de Time Travel)");
    expect(p).toContain(escribe);
    expect(p).toMatch(/wrangler d1 time-travel info travel-puzzle --json/);
    expect(p).toMatch(/Sin bookmark de Time Travel: no se escribe/);
    expect(wf.indexOf("Respaldo previo (instante de Time Travel)")).toBeLessThan(wf.indexOf("name: Subir a R2 privado + índice"));
  });
  it("REQ-775 después de subir: verifica en D1 las filas de la corrida contra el ensayo y corre el humo en producción", () => {
    const v = paso("Verificar en D1 contra el ensayo");
    expect(v).toContain(escribe);
    expect(v).toMatch(/FROM ProviderRecord WHERE runId LIKE 'respaldo:\$\{\{ inputs\.archivo \}\}:%'/);
    expect(v).toMatch(/tmp\/crudo-reporte\.json/);
    const h = paso("Prueba de humo en producción");
    expect(h).toContain(escribe);
    expect(h).toMatch(/smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
  });
  it("REQ-775 el resumen del ensayo publica solo cifras (sin el crudo)", () => {
    const r = paso("Cifras del ensayo");
    expect(r).toMatch(/GITHUB_STEP_SUMMARY/);
    expect(r).not.toMatch(/cat tmp\/crudo\/|raw\//);
  });
});

describe("REQ-769 runbook con los candados en orden", () => {
  const rb = readFileSync("docs/runbooks/copia-exacta.md", "utf8");
  it("REQ-769 bucket → binding → 0022 → bandera → FREETOUR → imports → documentos → firma → 0023 → banderas de taxonomía", () => {
    const order = ["**Bucket**", "**Binding**", "**Migración 0022**", "**Bandera `RAW_ARCHIVE_ENABLED=\"true\"`**", "**Respaldo retroactivo de FREETOUR**",
      "**Respaldo retroactivo de los imports**", "**Documentos originales**", "**Firma de los mapeos", "**Migración 0023**", "**Banderas de la taxonomía**"];
    const at = order.map((o) => rb.indexOf(o));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(rb).toMatch(/Cada paso es un candado/);
  });
});
