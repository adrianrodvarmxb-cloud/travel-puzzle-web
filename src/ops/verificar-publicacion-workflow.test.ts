// REQ-1610 (gates A1 y B1, PO 12 nov 2026): el verificador relanza una vez al día y, si no, avisa y se detiene.
// npx vitest run src/ops/verificar-publicacion-workflow.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wf = readFileSync(".github/workflows/verificar-publicacion.yml", "utf8");
const at = (name: string) => wf.indexOf(`- name: ${name}`);
const paso = (name: string, hasta: string) => wf.slice(at(name), at(hasta));

describe("REQ-1610: workflow del verificador de publicación", () => {
  it("REQ-1610: corre solo, cada media hora, y también a mano", () => {
    expect(wf).toMatch(/schedule:\s*\n\s*- cron: "17,47 \* \* \* \*"/);
    expect(wf).toContain("workflow_dispatch:");
  });

  it("REQ-1610: no se pisa consigo mismo y no cancela la corrida en curso", () => {
    expect(wf).toMatch(/group: verificar-publicacion/);
    expect(wf).toMatch(/cancel-in-progress: false/);
  });

  it("REQ-1610: permisos mínimos: no escribe en el repo, solo lanza workflows y abre issues", () => {
    const perm = wf.slice(wf.indexOf("permissions:"), wf.indexOf("env:"));
    expect(perm).toMatch(/contents: read/);
    expect(perm).toMatch(/actions: write/);
    expect(perm).toMatch(/issues: write/);
    expect(perm).not.toMatch(/contents: write/);
  });

  it("REQ-1610: reúne el estado de main y de los deploys, y cuenta los reintentos de hoy por su etiqueta", () => {
    const p = paso("Reunir el estado", "Decidir");
    expect(p).toMatch(/repos\/\$REPO\/commits\/main/);
    expect(p).toMatch(/deploy-cloudflare\.yml\/runs\?branch=main/);
    expect(p).toMatch(/select\(\.conclusion == "success"\)/);
    expect(p).toMatch(/labels=\$MARCA/);
    expect(p).toMatch(/shaMain|shaUltimoExitoso|reintentosHoy/);
  });

  it("REQ-1610: la decisión la toma la lógica pura, no el YAML", () => {
    const p = paso("Decidir", "Relanzar el deploy (gate A1)");
    expect(p).toMatch(/npx tsx src\/scripts\/verificar-publicacion\.ts estado\.json/);
    expect(p).toMatch(/GITHUB_OUTPUT/);
  });

  it("REQ-1610 (A1): solo con «reintentar» relanza el deploy, y deja su issue marcado", () => {
    const p = paso("Relanzar el deploy (gate A1)", "Avisar y detenerse (gate B1)");
    expect(p).toMatch(/if: steps\.decidir\.outputs\.accion == 'reintentar'/);
    expect(p).toMatch(/deploy-cloudflare\.yml\/dispatches" -f ref=main/);
    expect(p).toMatch(/labels\[\]=\$MARCA/);
    expect(p).toMatch(/relanzada automáticamente/);
  });

  it("REQ-1610 (B1): con «avisar» no relanza nada; solo abre o comenta el issue", () => {
    const p = paso("Avisar y detenerse (gate B1)", "Sin nada que hacer");
    expect(p).toMatch(/if: steps\.decidir\.outputs\.accion == 'avisar'/);
    expect(p).not.toMatch(/dispatches/);
    expect(p).toMatch(/producción quedó atrás de main/);
    expect(p).toMatch(/candado de deploy/);
  });

  it("REQ-1610: nunca hace merge, push ni toca banderas", () => {
    expect(wf).not.toMatch(/\bgit push\b|\/merge\b|wrangler/);
  });

  it("REQ-1610: el motivo llega al shell por env, nunca interpolado dentro del comando", () => {
    // Cada línea que menciona la decisión es o una condición `if:` o una variable de entorno; ninguna va en un comando.
    const lineas = wf.split("\n").filter((l) => l.includes("steps.decidir.outputs"));
    expect(lineas.length).toBeGreaterThan(0);
    for (const l of lineas) expect(l).toMatch(/^\s+(if: steps\.decidir\.outputs\.accion ==|MOTIVO: \$\{\{ steps\.decidir\.outputs\.motivo \}\}$)/);
    expect(wf).toMatch(/- Motivo: \$MOTIVO/);
  });

  it("REQ-1610: cada acción del verificador tiene su rama en el workflow", () => {
    for (const a of ["reintentar", "avisar", "esperar"]) expect(wf).toContain(`outputs.accion == '${a}'`);
  });
});
