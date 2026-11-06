// REQ-186 (PO, 6 nov 2026; gate A): la revisión de un PR no sube su versión mientras main está publicando.
// Causa (6 nov, 15e7cfd): un PR subió una versión al mismo Worker durante la publicación de main; Cloudflare no deja
// cambiar secretos si la última versión no es la publicada, falló "Secretos del Worker" y no corrió la prueba de producción.
// No se usa un grupo de concurrency compartido porque GitHub cancelaría una publicación pendiente al llegar un PR.
// npx vitest run src/ops/subidas-workflow.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const pr = readFileSync(".github/workflows/prueba-humo.yml", "utf8");
const deploy = readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");

describe("REQ-186: los PR no suben versiones mientras main publica", () => {
  it("REQ-186: antes de subir, el PR espera a que no haya «Publicar en Cloudflare» en curso", () => {
    const espera = pr.indexOf("name: Esperar a que main termine de publicar");
    const subir = pr.indexOf("name: Subir versión (sin tráfico)");
    expect(espera).toBeGreaterThan(0);
    expect(espera).toBeLessThan(subir);
    const paso = pr.slice(espera, subir);
    expect(paso).toMatch(/deploy-cloudflare\.yml\/runs\?status=\$st/);
    expect(paso).toMatch(/for st in in_progress queued; do/); // en curso y en fila
    expect(paso).toMatch(/for i in \$\(seq 1 \d+\)/); // tiene tope: no espera para siempre
  });
  it("REQ-186: el PR solo pide permiso de lectura de Actions para consultar", () => {
    expect(pr).toMatch(/\npermissions:\n(?: {2}\w+: \w+\n)* {2}actions: read\n/);
  });
  it("REQ-186: la publicación de main sigue en su propio grupo y nunca se cancela", () => {
    expect(deploy).toMatch(/concurrency:\n {2}group: deploy-cloudflare\n {2}cancel-in-progress: false/);
    expect(pr).not.toMatch(/group: deploy-cloudflare/);
  });
});
