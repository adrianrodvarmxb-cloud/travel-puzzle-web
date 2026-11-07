import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gate = readFileSync("docs/gates-blog-diario-2026-11-06.md", "utf8");

describe("gate del blog diario", () => {
  it("REQ-960: gate «Publica solo cada día» firmado, con G1–G3 y las tres condiciones estrictas", () => {
    expect(gate).toContain("«Publica solo cada día»");
    for (const g of ["G1", "G2", "G3"]) expect(gate).toMatch(new RegExp(`\\| ${g} \\|[^\\n]*\\[x\\] PO, 6 nov 2026`));
    expect(gate).toContain("Solo datos de fuentes públicas citadas y enlazadas, y de nuestro catálogo");
    expect(gate).toContain("Cero casos, citas, cifras o testimonios inventados");
    expect(gate).toContain("se OMITEN, no se rellenan");
    expect(gate).toContain("Equipo editorial de Travel Puzzle");
  });
});
