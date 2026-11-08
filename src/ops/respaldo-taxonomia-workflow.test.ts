// REQ-1247: respaldo de SOLO LECTURA de las tablas de la taxonomía (0017) antes de encender TAXONOMY_SYNC_ENABLED.
// npx vitest run src/ops/respaldo-taxonomia-workflow.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/respaldo-taxonomia.yml", "utf8");
const TABLAS = ["ExperienceTaxonomy", "ExperienceTaxonomyOverride", "TaxonomyRun"];

describe("REQ-1247: workflow «Respaldo de la taxonomía (solo lectura)»", () => {
  it("REQ-1247: solo a mano y con permisos de lectura", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:/);
    expect(wf).not.toMatch(/\n {2}(push|pull_request|schedule):/);
    expect(wf).toMatch(/permissions:\n {2}contents: read/);
  });
  it("REQ-1247: exporta las 3 tablas de la 0017 con SELECT y sube el artefacto", () => {
    for (const t of TABLAS) expect(wf).toContain(`SELECT * FROM \\"${t}\\"`);
    expect(wf).toMatch(/upload-artifact@v4/);
    expect(wf).toMatch(/retention-days: 90/);
  });
  it("REQ-1247: no escribe: ningún INSERT, UPDATE, DELETE, DROP, ALTER, migración ni deploy", () => {
    expect(wf).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|REPLACE)\b/i);
    expect(wf).not.toMatch(/d1 migrations|wrangler (deploy|versions)|--file/);
    expect(wf.match(/d1 execute/g)?.length).toBe(1); // una sola función q() de lectura
  });
});
