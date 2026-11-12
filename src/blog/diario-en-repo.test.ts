import { describe, expect, it } from "vitest";
import { DIARIO_POSTS } from "./content";
import { parsePost } from "./lib/schema";
import { dailyEnProblems } from "./lib/diario-en";

describe("REQ-3340: versión en inglés de las entradas ya publicadas del blog (gate C1)", () => {
  const posts = DIARIO_POSTS.map((p) => { const r = parsePost(p); if (!r.ok) throw new Error(r.error); return r.post; });

  it("REQ-3340: cada entrada del blog diario tiene su versión en inglés y pasa las reglas en inglés", () => {
    const bad = posts.flatMap((p) => dailyEnProblems(p, posts).map((x) => `${p.slug}: ${x}`));
    expect(bad).toEqual([]);
  });

  it("REQ-3340: ninguna entrada publicada queda sin versión en inglés", () => {
    expect(posts.filter((p) => !p.draft && !p.en).map((p) => p.slug)).toEqual([]);
  });
});

describe("REQ-3339: el prompt del agente diario pide la versión en inglés", () => {
  it("REQ-3339: docs/blog/agente-diario.md exige el campo `en` con sus reglas", async () => {
    const { readFileSync } = await import("node:fs");
    const prompt = readFileSync("docs/blog/agente-diario.md", "utf8");
    expect(prompt).toMatch(/Versión en inglés \(gate B2, REQ-3339; obligatoria\)/);
    expect(prompt).toMatch(/«In short»/);
    expect(prompt).toMatch(/Free Puzzle/);
  });
});
