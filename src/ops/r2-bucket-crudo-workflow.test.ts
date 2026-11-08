// REQ-770: workflow de una sola vez que crea el bucket PRIVADO travel-puzzle-raw. npx vitest run src/ops/r2-bucket-crudo-workflow.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/r2-bucket-crudo.yml", "utf8");
const paso = (nombre: string) => {
  const i = wf.indexOf(`- name: ${nombre}`);
  const j = wf.indexOf("\n      - ", i + 1);
  return wf.slice(i, j < 0 ? undefined : j);
};

describe("REQ-770: workflow «R2: crear bucket de la copia exacta»", () => {
  it("REQ-770: solo a mano; crear apagado por omisión y con confirmación escrita del nombre", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:\n/);
    expect(wf).not.toMatch(/\n {2}(push|pull_request|schedule):/);
    expect(wf).toMatch(/ {6}crear:\n.*\n {8}type: boolean\n {8}default: false/);
    expect(paso("Crear el bucket (solo con crear=true y el nombre confirmado)")).toMatch(
      /if: inputs\.crear && inputs\.confirmar == 'travel-puzzle-raw'/,
    );
  });
  it("REQ-770: primero comprueba el permiso del token (lista de buckets) y no recrea si ya existe", () => {
    const lista = wf.indexOf("name: Permiso del token (listar buckets)");
    const crear = wf.indexOf("name: Crear el bucket");
    expect(lista).toBeGreaterThan(0);
    expect(crear).toBeGreaterThan(lista);
    expect(paso("Crear el bucket (solo con crear=true y el nombre confirmado)")).toMatch(/wrangler r2 bucket create "\$BUCKET"/);
    expect(paso("Crear el bucket (solo con crear=true y el nombre confirmado)")).toMatch(/ya existe/);
  });
  it("REQ-770: verifica que quede privado (sin r2.dev ni dominio propio) y no sube artefactos", () => {
    const v = paso("Verificar que es privado");
    expect(v).toMatch(/wrangler r2 bucket dev-url get "\$BUCKET"/);
    expect(v).toMatch(/wrangler r2 bucket domain list "\$BUCKET"/);
    expect(wf).not.toMatch(/upload-artifact/);
    expect(wf).toMatch(/BUCKET: travel-puzzle-raw/);
  });
  it("REQ-770: no toca D1, banderas ni el deploy", () => {
    expect(wf).not.toMatch(/d1 (execute|migrations)/);
    expect(wf).not.toMatch(/wrangler (deploy|versions)/);
  });
});
