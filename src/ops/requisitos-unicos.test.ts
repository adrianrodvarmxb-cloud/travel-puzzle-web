// REQ-227: cada número REQ tiene una sola fila en docs/requisitos.md (choques del merge del PR #144, 6 nov 2026).
// npx vitest run src/ops/requisitos-unicos.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const rows = readFileSync("docs/requisitos.md", "utf8").split("\n").filter((l) => /^\| REQ-\d+ /.test(l));
const ids = rows.map((l) => l.match(/^\| (REQ-\d+) /)![1]);
const dup = (xs: string[]) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))];

describe("REQ-227: numeración de requisitos sin choques", () => {
  it("REQ-227: ningún REQ aparece en dos filas de docs/requisitos.md", () => {
    expect(dup(ids)).toEqual([]);
  });

  it("REQ-227: la llave del agente es REQ-225 y la espera de los PR es REQ-226 (185 y 186 son del frente de carruseles)", () => {
    const fila = (id: string) => rows.find((l) => l.startsWith(`| ${id} `)) ?? "";
    expect(fila("REQ-225")).toMatch(/llave del catálogo del agente/);
    expect(fila("REQ-226")).toMatch(/no suban versiones al mismo tiempo/);
    expect(fila("REQ-185")).toBe("");
    expect(fila("REQ-186")).toBe("");
  });

  it("REQ-227: los workflows y sus tests citan los números nuevos", () => {
    const llave = readFileSync(".github/workflows/llave-agente.yml", "utf8") + readFileSync("src/ops/llave-agente-workflow.test.ts", "utf8");
    const subidas = readFileSync(".github/workflows/prueba-humo.yml", "utf8") + readFileSync("src/ops/subidas-workflow.test.ts", "utf8");
    expect(llave).toMatch(/REQ-225/);
    expect(subidas).toMatch(/REQ-226/);
    expect(llave + subidas).not.toMatch(/REQ-18[56]\b/);
  });
});
