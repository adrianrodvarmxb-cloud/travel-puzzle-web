// REQ-154: la llave del agente se crea y se carga sin que nadie la vea. npx vitest run src/ops/llave-agente-workflow.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/llave-agente.yml", "utf8");

describe("REQ-154: llave del agente", () => {
  it("REQ-154: solo se corre a mano y con permisos de lectura", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:\n\n/);
    expect(wf).not.toMatch(/\n {2}(push|pull_request|schedule):/);
    expect(wf).toMatch(/\npermissions:\n {2}contents: read\n/);
  });
  it("REQ-154: la misma llave va a los dos Workers, enmascarada y sin imprimirse", () => {
    expect(wf).toMatch(/llave=\$\(openssl rand -hex 32\)/);
    expect(wf).toMatch(/::add-mask::\$llave/);
    expect(wf).toMatch(/printf '%s' "\$llave" \| npx wrangler secret put AGENTE_TOKEN --name travel-puzzle-web > \/dev\/null/);
    expect(wf).toMatch(/printf '%s' "\$llave" \| npx wrangler secret put CATALOGO_TRAVEL_PUZZLE --name mila-zoefel > \/dev\/null/);
    expect(wf).not.toMatch(/echo "?\$llave/);
  });
  it("REQ-154: no puede cancelar una publicación de main (grupo propio)", () => {
    expect(wf).toMatch(/concurrency:\n {2}group: llave-agente\n {2}cancel-in-progress: false/);
    expect(wf).not.toMatch(/group: deploy-cloudflare/);
  });
});
