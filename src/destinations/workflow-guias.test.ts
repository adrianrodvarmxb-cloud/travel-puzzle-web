import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wf = readFileSync(".github/workflows/guias-ciudad.yml", "utf8");
const step = (name: string) => { const i = wf.indexOf(`- name: ${name}`); expect(i, name).toBeGreaterThan(-1); return i; };

describe("workflow guias-ciudad.yml", () => {
  it("REQ-1221 + REQ-1232: recibe 1 o 2 guías, valida antes de la rama y el PR, y el PR solo cambia guias.json (nunca D1)", () => {
    expect(wf).toMatch(/workflow_dispatch:\s+inputs:\s+guias:/);
    expect(step("Validar y agregar a guias.json")).toBeLessThan(step("Rama y PR"));
    expect(wf).toContain('grep -vxF "src/destinations/content/guias.json"');
    expect(wf).toContain("git add src/destinations/content/guias.json");
    expect(wf).not.toMatch(/wrangler d1|d1 execute|git push[^\n]*(main|--force)/);
  });

  it("REQ-1232 + REQ-1231: suite, tsc, build y humo del preview (con las páginas de las guías) antes del merge; deploy después; issue si falla", () => {
    const merge = step("Merge squash (publicación)");
    for (const s of ["Pruebas", "Tipos (tsc)", "Construir", "Prueba de humo (preview con las guías)"]) expect(step(s)).toBeLessThan(merge);
    expect(wf).toContain(`grep -q 'aria-label="En breve"' page.html`);
    expect(merge).toBeLessThan(step("Publicar en Cloudflare (deploy con su humo y regreso automático)"));
    expect(wf).toMatch(/- name: Dejar el motivo en un issue \(NO PUBLICADO\)\s+if: failure\(\)/);
    expect(wf).toContain('title="Guías de ciudad: no se publicó"');
  });
});

describe("gate G5", () => {
  it("REQ-1235: G5 registrado y firmado (publicación diaria de guías sin revisión, mismas reglas de fuentes)", () => {
    const gate = readFileSync("docs/gates-blog-diario-2026-11-06.md", "utf8");
    expect(gate).toMatch(/\| G5 \|[^\n]*no se escribe en D1[^\n]*\[x\] PO, 7 nov 2026, 06:17/);
  });

  it("REQ-1236: G5 registra el cambio de 2 a 5 guías por día con la petición literal", () => {
    const gate = readFileSync("docs/gates-blog-diario-2026-11-06.md", "utf8");
    expect(gate).toMatch(/\| G5\.1 \|[^\n]*5 guías por día[^\n]*\[x\] PO, 7 nov 2026, 07:50/);
    expect(wf).toContain("Arreglo JSON con 1 a 5 guías");
  });
});
