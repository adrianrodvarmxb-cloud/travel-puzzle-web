import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guideProblems, guidePlain, parseGuide } from "./lib/guia";
import { blogTerms } from "./guias-run";
import { wordCount, cityMeetsRule } from "./lib/indexing";
import { ORDEN_GUIAS } from "./content/guias-orden";

const ejemplos = JSON.parse(readFileSync("docs/guias/ejemplos/2026-11-07-paris-pekin.json", "utf8"));
const prompt = readFileSync("docs/blog/agente-diario.md", "utf8");

describe("primera tanda de guías", () => {
  it("REQ-1233: París y Pekín (las 2 primeras de las 37) pasan el validador con su fecha y bastan para indexar con 1 tour", () => {
    // Rutas verificadas en sitemap-destinos.xml de producción el 7 nov 2026.
    const knownPaths = new Set(["/destinos/fr/paris", "/destinos/cn/pekin", "/destinos/cn"]);
    const existing = [];
    for (const g of ejemplos) {
      const r = guideProblems(g, { today: "2026-11-07", existing, knownPaths, otherTerms: blogTerms() });
      expect(r.ok ? [] : r.problems).toEqual([]);
      if (r.ok) { existing.push(r.guide); expect(cityMeetsRule({ activeTours: 1, guide: guidePlain(r.guide) })).toBe(true); expect(wordCount(guidePlain(r.guide))).toBeGreaterThanOrEqual(300); }
    }
    expect(ejemplos.map((g: { pais: string; ciudad: string }) => `${g.pais}/${g.ciudad}`)).toEqual(ORDEN_GUIAS.slice(0, 2));
    expect(ejemplos.every((g: unknown) => parseGuide(g).ok)).toBe(true);
  });

  it("REQ-1234 + REQ-1236: el prompt del agente diario incluye las 5 guías por día, su orden y su validación", () => {
    expect(prompt).toContain("## Paso 7 — Cinco guías de ciudad");
    expect(prompt).toContain("**5 guías propias de ciudad**");
    expect(prompt).toContain("npx tsx src/scripts/guias-tema.ts");
    expect(prompt).toContain("npx tsx src/scripts/guias-ciudad.ts validar docs/guias/entradas/{hoy}.json");
    expect(prompt).toContain("actions/workflows/guias-ciudad.yml/dispatches");
    expect(prompt).toContain("primero las 37 ciudades con viaje propio");
  });
});
