import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { wranglerVars } from "@/site/lib/pages";

const wf = readFileSync(".github/workflows/redes-diario.yml", "utf8");
const blog = readFileSync(".github/workflows/blog-diario.yml", "utf8");

describe("workflow redes-diario.yml", () => {
  it("REQ-1075: se lanza tras publicar la entrada (blog-diario lo despacha con la ruta) y corre el script de redes", () => {
    expect(wf).toMatch(/workflow_dispatch:\s+inputs:\s+ruta:/);
    expect(blog.indexOf("- name: Lanzar las redes del día")).toBeGreaterThan(blog.indexOf("- name: Registrar la publicación"));
    expect(blog).toContain('actions/workflows/redes-diario.yml/dispatches" -f ref=main -f "inputs[ruta]=${{ steps.validar.outputs.path }}"');
    expect(blog.indexOf("- name: Láminas de Instagram")).toBeLessThan(blog.indexOf("- name: Validar y agregar a diario.json"));
    expect(wf).toContain('npx tsx src/scripts/redes-diario.ts "$RUTA" --salida redes-salida');
  });

  it("REQ-1076: banderas por red en \"false\" y tokens solo como secretos (nunca en el repo)", () => {
    const v = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
    expect([v.SOCIAL_LINKEDIN_ENABLED, v.SOCIAL_FACEBOOK_ENABLED, v.SOCIAL_INSTAGRAM_ENABLED]).toEqual(["false", "false", "false"]);
    for (const k of ["META_PAGE_ID", "META_PAGE_TOKEN", "META_IG_USER_ID", "LINKEDIN_ORG_ID", "LINKEDIN_TOKEN"]) expect(wf).toContain(`${k}: \${{ secrets.${k} }}`);
    expect(wf).not.toMatch(/EAA[A-Za-z0-9]{20,}|AQ[A-Za-z0-9_-]{40,}/);
  });

  it("REQ-1080 + REQ-1081: una red que falla no detiene el resto; artefacto e issue «Redes del día» siempre que algo quede manual", () => {
    expect(wf).toMatch(/- name: Textos, validación y publicación por red\s+id: redes\s+continue-on-error: true/);
    expect(wf).toMatch(/uses: actions\/upload-artifact@v4\s+if: always\(\)/);
    expect(wf).toContain("Redes del día: ${r.fecha} — ${r.titulo}");
    expect(wf).toContain('title="Redes: no se publicó"');
    expect(wf).toMatch(/Issue «Redes: no se publicó» \(motivo por red\)"\s+if: steps\.redes\.outcome == 'failure'/);
  });
});
