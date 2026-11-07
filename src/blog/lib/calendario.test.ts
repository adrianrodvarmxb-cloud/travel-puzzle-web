import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALENDARIO } from "../content/calendario";
import { pillarBySlug, PILLARS } from "./pillars";
import { termConflicts, normalizeTerm } from "./terms";
import { POSTS } from "../content";

const rows = readFileSync("docs/blog/calendario.md", "utf8")
  .split("\n")
  .map((l) => /^\| (\d+) \| ([A-Z0-9-]+) \| (\w[\w-]*) \| (pago|free) \| ([^|]+) \| ([^|]+) \|$/.exec(l.trim()))
  .filter((m): m is RegExpExecArray => !!m)
  .map((m) => ({ n: Number(m[1]), id: m[2], pillar: m[3], mix: m[4], term: m[5].trim(), catalog: m[6].trim() }));

describe("calendario del blog diario", () => {
  it("REQ-961: el código y docs/blog/calendario.md coinciden, en el mismo orden", () => {
    expect(rows.length).toBe(CALENDARIO.length);
    expect(CALENDARIO.map((c, i) => ({ n: i + 1, ...c }))).toEqual(rows);
  });

  it("REQ-961: cada ID pertenece a un pilar activo y apunta a una página del catálogo", () => {
    for (const c of CALENDARIO) {
      expect(pillarBySlug(c.pillar)?.status, c.id).toBe("activo");
      expect(c.catalog, c.id).toMatch(/^\/(destinos|tours|viajes|la-primera-pieza)/);
    }
    expect(new Set(CALENDARIO.map((c) => c.id)).size).toBe(CALENDARIO.length);
  });

  it("REQ-961 + REQ-970: un término por ID, sin términos casi iguales entre sí, con los pilares ni con los artículos", () => {
    const others = [
      ...PILLARS.map((p) => ({ term: p.term, label: `pilar ${p.slug}` })),
      ...POSTS.map((p) => ({ term: p.targetTerm, label: p.slug })),
    ];
    CALENDARIO.forEach((c, i) => {
      const rest = CALENDARIO.filter((_, j) => j !== i).map((x) => ({ term: x.term, label: x.id }));
      expect(termConflicts(c.term, [...rest, ...others]), c.id).toEqual([]);
      expect(normalizeTerm(c.term).length, c.id).toBeGreaterThan(1);
    });
  });

  it("REQ-962: cada bloque de 10 trae 8 de pago y 2 de free (posiciones 5 y 10)", () => {
    for (let i = 0; i < CALENDARIO.length; i += 10) {
      const block = CALENDARIO.slice(i, i + 10);
      expect(block.filter((c) => c.mix === "free").length, `bloque ${i / 10 + 1}`).toBe(2);
      expect([block[4]?.mix, block[9]?.mix]).toEqual(["free", "free"]);
    }
  });
});
