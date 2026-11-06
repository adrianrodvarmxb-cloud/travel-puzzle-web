import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** REQ-452: la afirmación «Viajes armados por nuestros expertos» era falsa (los viajes son de proveedores) y se borró. */
const FALSE_CLAIM = /armados por (nuestros )?expertos|nuestros expertos|our experts|nossos especialistas|unseren experten|nos experts|nostri esperti|viajes by travel puzzle|trips by travel puzzle/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|json)$/.test(f) && !f.endsWith("no-expert-claim.test.ts") ? [p] : [];
  });
}

describe("REQ-452: sin el carrusel «Viajes armados por nuestros expertos»", () => {
  it("REQ-452: ningún archivo de src/ trae la frase ni «nuestros expertos» (es, en, pt, de, fr, it)", () => {
    expect(files("src").filter((f) => FALSE_CLAIM.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});
