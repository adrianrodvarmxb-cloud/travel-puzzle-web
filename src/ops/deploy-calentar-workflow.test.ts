import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// REQ-1358 (INC-009): la versión de preview (workers.dev) no tiene Cache API, así que la prueba de humo de antes de
// publicar nunca calienta la caché de producción. Con una llave nueva (p. ej. `destinos` v9), la primera petición a
// /destinos reconstruye el árbol en frío (11–18 s) y puede dar 503. Después de publicar y antes del humo de producción,
// se calientan las páginas pesadas; el humo sigue exigiendo 200 en todo.
const wf = readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");
const at = (name: string) => wf.indexOf(`- name: ${name}`);

describe("REQ-1358: calentar la caché de producción antes del humo", () => {
  it("REQ-1358: el paso existe entre «Publicar» y «Prueba de humo (producción)», solo si se publicó", () => {
    const calentar = at("Calentar la caché de producción (INC-009)");
    expect(calentar).toBeGreaterThan(at("Publicar"));
    expect(calentar).toBeLessThan(at("Prueba de humo (producción)"));
    const step = wf.slice(calentar, at("Prueba de humo (producción)"));
    expect(step).toMatch(/if: always\(\) && steps\.publicar\.outcome == 'success'/);
  });
  it("REQ-1358: calienta /destinos, /en/destinos, /tours, el inicio y el sitemap, con reintentos y tiempos en el registro", () => {
    const step = wf.slice(at("Calentar la caché de producción (INC-009)"), at("Prueba de humo (producción)"));
    for (const p of ["/destinos", "/en/destinos", "/tours", "/en/tours", "/la-primera-pieza", "/sitemap-index.xml"]) expect(step).toContain(` ${p} `.trim());
    expect(step).toMatch(/time_total/);
    expect(step).toMatch(/for intento in 1 2 3 4 5 6/);
  });
  it("REQ-1358: calentar nunca tumba el deploy por sí solo (lo juzga la prueba de humo, que exige 200)", () => {
    const step = wf.slice(at("Calentar la caché de producción (INC-009)"), at("Prueba de humo (producción)"));
    expect(step).toMatch(/continue-on-error: true/);
    expect(wf).toMatch(/Prueba de humo \(producción\)[\s\S]*smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
  });
});
