// REQ-3512: el «Tablero de pendientes con folio» de docs/requisitos.md no se desincroniza de wrangler.jsonc.
// Lección del 13 nov 2026: banderas encendidas en producción (TAXONOMY_CART_ENABLED, EXPERTOS_ENABLED,
// REVIEW_EMAILS/EMAIL_CROSS_SELL, ADULT_CONTACT/GEO_ATTRIBUTION) mientras su fila del tablero decía
// PENDIENTE/EN CURSO/BLOQUEADO. Esta prueba lo vuelve una falla roja automática.
// npx vitest run src/ops/tablero-banderas-sync.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { wranglerVars } from "@/site/lib/pages";

const vars = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
const rows = readFileSync("docs/requisitos.md", "utf8")
  .split("\n")
  .filter((l) => /^\| REQ-\d+ \| BANDERA \|/.test(l));

// Banderas reales (las que existen en wrangler.jsonc) que la fila nombra literalmente.
function flagsDeLaFila(row: string): string[] {
  return Object.keys(vars).filter((f) => f.endsWith("_ENABLED") && row.includes(f));
}
// Último estado de la fila (antepenúltima celda del renglón de la tabla).
function estado(row: string): string {
  const celdas = row.split("|").map((c) => c.trim());
  return celdas[celdas.length - 2] ?? "";
}
const TERMINAL = /^(CUMPLIDO|REEMPLAZADO|CANCELADO)/;

describe("REQ-3512: el tablero de banderas sigue a wrangler.jsonc", () => {
  it("REQ-3512: hay filas BANDERA que leer (no se rompió el parseo)", () => {
    expect(rows.length).toBeGreaterThan(5);
  });

  it("REQ-3512: ninguna fila BANDERA con todas sus banderas en \"true\" sigue abierta", () => {
    const malas = rows
      .map((row) => ({ row, flags: flagsDeLaFila(row), est: estado(row) }))
      .filter(({ flags }) => flags.length > 0)
      .filter(({ flags }) => flags.every((f) => vars[f] === "true"))
      .filter(({ est }) => !TERMINAL.test(est))
      .map(({ row }) => row.slice(0, 80));
    expect(malas, `encendidas en wrangler.jsonc pero su fila no está CUMPLIDO/REEMPLAZADO:\n${malas.join("\n")}`).toEqual([]);
  });
});
