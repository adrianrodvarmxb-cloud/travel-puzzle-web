import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * REQ-861 (PO, 6-11 22:36: «Quítalo» — C5 de FREETOUR prohíbe insignias sobre sus fotos): ninguna tarjeta del sitio
 * pinta «★ Favorito» encima de la foto. Escaneo del código: la insignia nunca lleva posición absoluta.
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") && !p.endsWith(".test.tsx") ? [p] : [];
  });
}

describe("REQ-861: «★ Favorito» fuera de la foto en todas las tarjetas", () => {
  it("REQ-861: ningún componente posiciona TravelerFavoriteBadge ni card-favorite con absolute", () => {
    const bad: string[] = [];
    for (const f of files("src")) {
      const src = readFileSync(f, "utf8");
      for (const line of src.split("\n")) {
        if (/<TravelerFavoriteBadge[^>]*absolute/.test(line)) bad.push(`${f}: ${line.trim()}`);
        if (/data-testid="card-favorite"[^>]*absolute/.test(line)) bad.push(`${f}: ${line.trim()}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
