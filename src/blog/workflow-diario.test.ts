import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wf = readFileSync(".github/workflows/blog-diario.yml", "utf8");
const step = (name: string) => { const i = wf.indexOf(`- name: ${name}`); expect(i, name).toBeGreaterThan(-1); return i; };

describe("workflow blog-diario.yml", () => {
  it("REQ-975: recibe la entrada por workflow_dispatch (o rama blog/entrada-*) y valida antes de crear rama y PR", () => {
    expect(wf).toMatch(/workflow_dispatch:\s+inputs:\s+entrada:/);
    expect(wf).toContain('branches: ["blog/entrada-*"]');
    expect(step("Validar y agregar a diario.json")).toBeLessThan(step("Rama y PR"));
    expect(wf).toContain("blog-diario.ts validar");
  });

  // REQ-1055 reemplaza «solo diario.json» por «diario.json + imágenes de la entrada» (gate G4, 7 nov 2026).
  it("REQ-975 (G2) + REQ-1055: el PR solo cambia diario.json y las imágenes de esa entrada; nunca push a main ni force-push", () => {
    expect(wf).toContain('grep -vxF "src/blog/content/diario.json"');
    expect(wf).toContain('grep -vE "^public/blog/img/$slug/[a-z0-9-]+-(800|1600)\\.(avif|webp|jpg)$"');
    expect(wf).toContain('git add src/blog/content/diario.json "public/blog/img/$SLUG"');
    expect(wf).not.toMatch(/git push[^\n]*(main|--force|-f\b)/);
  });

  it("REQ-975: suite, tsc, build y humo con BLOG_ENABLED encendida SOLO en el preview, antes del merge", () => {
    const merge = step("Merge squash (publicación)");
    for (const s of ["Pruebas", "Tipos (tsc)", "Blog encendido solo para el preview", "Construir", "Prueba de humo (preview con el blog encendido)"]) expect(step(s)).toBeLessThan(merge);
    expect(wf).toContain(`sed -i 's/"BLOG_ENABLED": "false"/"BLOG_ENABLED": "true"/' wrangler.jsonc`);
    expect(wf).toContain(`grep -q '"BLOG_SHOW_DRAFTS": "false"' wrangler.jsonc`);
    expect(wf.slice(merge)).toMatch(/git checkout -- wrangler\.jsonc[\s\S]*merge_method=squash -f sha=/);
  });

  it("REQ-975: tras el merge lanza el deploy (con su humo) y, si algo falla, deja el motivo en un issue", () => {
    expect(step("Merge squash (publicación)")).toBeLessThan(step("Publicar en Cloudflare (deploy con su humo y regreso automático)"));
    expect(wf).toContain("actions/workflows/deploy-cloudflare.yml/dispatches");
    expect(wf).toMatch(/- name: Dejar el motivo en un issue \(NO PUBLICADO\)\s+if: failure\(\)/);
    expect(wf).toContain('title="Blog diario: no se publicó"');
    expect(wf).toContain("blog-indexnow.ts");
  });

  it("REQ-1054 + REQ-1055: baja y optimiza las imágenes antes de validar, y el validador exige los archivos", () => {
    expect(step("Imágenes del blog (bajar y optimizar)")).toBeLessThan(step("Validar y agregar a diario.json"));
    expect(wf).toContain("PIXABAY_API_KEY: ${{ secrets.PIXABAY_API_KEY }}");
    expect(wf).toContain("blog-diario.ts validar \"$B/entrada.json\" --agregar --archivos");
  });
});
