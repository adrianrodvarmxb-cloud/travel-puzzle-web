import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateDailyEntry, FIXED_PATHS } from "./lib/diario";
import { CALENDARIO } from "./content/calendario";
import { DIARIO_POSTS } from "./content";
import { FREE_TOUR_POSTS_B1 } from "./lib/mix";
import { registryPosts, missingImageFiles } from "./diario-run";
import { parsePost } from "./lib/schema";

const prompt = readFileSync("docs/blog/agente-diario.md", "utf8");
const EJEMPLO = "docs/blog/ejemplos/2026-11-07-eu-01-requisitos-entrar-europa.json";
const ejemplo = JSON.parse(readFileSync(EJEMPLO, "utf8"));

describe("agente diario", () => {
  it("REQ-980: el prompt es autocontenido: tema del día, deep-research ligero, plantilla, FREETOUR, validación y envío; no crea la tarea", () => {
    for (const s of ["## Paso 1 — Qué toca hoy", "## Paso 2 — Elige el tema (deep-research ligero", "## Paso 3 — Escribe la entrada", "## Paso 4 — Valida en local", "## Paso 5 — Envía la entrada al workflow", "## Lo que nunca haces"]) expect(prompt).toContain(s);
    expect(prompt).toContain("npx tsx src/scripts/blog-tema.ts");
    expect(prompt).toContain("npx tsx src/scripts/blog-diario.ts validar");
    expect(prompt).toContain("actions/workflows/blog-diario.yml/dispatches");
    expect(prompt).toContain("**NO se incluyen** (requieren material del cliente)");
    expect(prompt).toContain("**Nunca copies descripciones de las fichas**");
    expect(prompt).toContain("Crear, cambiar o borrar tareas programadas");
    expect(prompt).toContain("Publica solo cada día");
  });

  // REQ-1040: el test ya no depende de que la entrada siga sin publicar; si el agente diario la publica,
  // se valida contra los demás artículos (sin compararla consigo misma) y la copia publicada debe ser la misma.
  it("REQ-981 + REQ-1040: la primera entrada real pasa el validador con su fecha, publicada o no", () => {
    // Rutas del catálogo que enlaza, verificadas en sitemap-destinos.xml de producción el 6 nov 2026.
    const knownPaths = new Set([...FIXED_PATHS, "/destinos/fr/paris", "/destinos/es/sevilla", "/destinos/cz/praga", "/destinos/pt/lisboa"]);
    const r = validateDailyEntry(ejemplo, { today: "2026-11-07", existing: registryPosts().filter((p) => p.slug !== ejemplo.slug), knownPaths, primeraPieza: true, b1FreeTours: FREE_TOUR_POSTS_B1, calendar: CALENDARIO });
    expect(r.ok ? [] : r.problems).toEqual([]);
    expect(ejemplo.tema).toEqual({ tipo: "calendario", clusterId: "EU-01", fuentes: [] });
    expect(ejemplo.author).toBe("editorial");
    expect(ejemplo).not.toHaveProperty("minicaso");
    expect(ejemplo).not.toHaveProperty("citas");
    const publicada = DIARIO_POSTS.find((p) => p.slug === ejemplo.slug);
    if (publicada) expect([publicada.title, publicada.targetTerm, publicada.pillar]).toEqual([ejemplo.title, ejemplo.targetTerm, ejemplo.pillar]);
  });

  it("REQ-1056: la entrada EU-01 trae portada y 4 fotos (Europa, pasaporte, París, Sevilla y Lisboa) con sus archivos optimizados en el repo", () => {
    const r = parsePost(ejemplo);
    if (!r.ok) throw new Error(r.error);
    expect(r.post.cover?.origen).toMatchObject({ banco: "pexels", id: "2598484", autor: "Pierre Blaché" });
    expect(r.post.imagenes?.map((b) => [b.formato, b.fotos.map((f) => f.src.split("/").pop())])).toEqual([["columna", ["pasaporte"]], ["collage", ["paris", "sevilla", "lisboa"]]]);
    expect(missingImageFiles(r.post, existsSync)).toEqual([]);
  });

  it("REQ-1057: el prompt pide portada y 2 a 4 fotos de bancos con licencia, sin FREETOUR, y corre blog-imagenes antes de validar", () => {
    expect(prompt).toContain("**Imágenes (premium, REQ-1050…1057):**");
    expect(prompt).toContain("**Nunca fotos de FREETOUR ni de las fichas del catálogo** (C2/C5)");
    expect(prompt).toContain("**Nunca Unsplash+**");
    expect(prompt).toContain("npx tsx src/scripts/blog-imagenes.ts docs/blog/entradas/{hoy}.json");
    expect(prompt).toContain("blog-diario.ts validar docs/blog/entradas/{hoy}.json --archivos");
  });
});
