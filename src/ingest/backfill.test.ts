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
