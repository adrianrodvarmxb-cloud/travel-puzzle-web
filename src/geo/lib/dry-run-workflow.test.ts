import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/geo-dry-run.yml", "utf8");

describe("workflow «Identidad geográfica v2 (ensayo)»", () => {
  it("REQ-140: corre cada lunes (schedule semanal, gate G6) además de manual", () => {
    expect(wf).toMatch(/\n {2}schedule:\n(?: +#.*\n)* +- cron: "\d{1,2} \d{1,2} \* \* 1"\n/);
    expect(wf).toMatch(/\n {2}workflow_dispatch:/);
  });

  it("REQ-140: sigue siendo solo lectura: permisos de lectura y D1 solo con SELECT", () => {
    expect(wf).toMatch(/\npermissions:\n {2}contents: read\n/);
    expect(wf).not.toMatch(/migrations apply|--file|UPDATE |INSERT |DELETE |ALTER |DROP /i);
    const queries = [...wf.matchAll(/(?<!\w)q ["']([^"']+)/g)].map((m) => m[1].trim());
    expect(queries.length).toBeGreaterThan(0);
    for (const q of queries) expect(q).toMatch(/^SELECT\b/);
  });
});
