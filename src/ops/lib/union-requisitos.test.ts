// REQ-3515: después de unir STATUS.md o docs/requisitos.md con merge=union, una fila REQ editada en las dos ramas
// queda dos veces. La pieza deja una sola: la de la rama del PR (su cambio es el que se quiere fusionar) y, si ninguna
// coincide con la rama, la de main. Las demás líneas (encabezados de tabla, párrafos) no se tocan.
// npx vitest run src/ops/lib/union-requisitos.test.ts
import { describe, expect, it } from "vitest";
import { dedupeReqRows, soloDocumentos } from "./union-requisitos";

const H = "| ID | Requisito | Estado |\n|---|---|---|";

describe("REQ-3515: unión de requisitos sin filas REQ repetidas", () => {
  it("REQ-3515: si la misma fila REQ quedó dos veces, gana la versión de la rama", () => {
    const main = `${H}\n| REQ-1 | a | EN CURSO |`;
    const rama = `${H}\n| REQ-1 | a | CUMPLIDO |`;
    const unido = `${H}\n| REQ-1 | a | CUMPLIDO |\n| REQ-1 | a | EN CURSO |`;
    const r = dedupeReqRows(unido, rama, main);
    expect(r.text).toBe(`${H}\n| REQ-1 | a | CUMPLIDO |`);
    expect(r.removed).toEqual(["| REQ-1 | a | EN CURSO |"]);
  });

  it("REQ-3515: si la rama no tenía la fila, se conserva la de main", () => {
    const main = `${H}\n| REQ-2 | b | CUMPLIDO |`;
    const rama = `${H}`;
    const unido = `${H}\n| REQ-2 | b | OTRA |\n| REQ-2 | b | CUMPLIDO |`;
    expect(dedupeReqRows(unido, rama, main).text).toBe(`${H}\n| REQ-2 | b | CUMPLIDO |`);
  });

  it("REQ-3515: los encabezados de tabla repetidos de secciones distintas se quedan (lección del 13-11)", () => {
    const main = `${H}\n| REQ-1 | a | x |`;
    const rama = `${H}\n| REQ-2 | b | y |`;
    const unido = `${H}\n| REQ-1 | a | x |\n\n## Nueva\n${H}\n| REQ-2 | b | y |`;
    const r = dedupeReqRows(unido, rama, main);
    expect(r.text).toBe(unido);
    expect(r.removed).toEqual([]);
  });

  it("REQ-3515: una fila que ya venía repetida en uno de los padres no se toca", () => {
    const main = `${H}\n| REQ-3 | c | x |\n| REQ-3 | c | x |`;
    const unido = main;
    expect(dedupeReqRows(unido, H, main).removed).toEqual([]);
  });

  it("REQ-3515: solo se actualiza un PR cuyo choque es de STATUS.md o docs/requisitos.md", () => {
    expect(soloDocumentos(["STATUS.md", "docs/requisitos.md"])).toBe(true);
    expect(soloDocumentos(["STATUS.md"])).toBe(true);
    expect(soloDocumentos(["STATUS.md", "wrangler.jsonc"])).toBe(false);
    expect(soloDocumentos([])).toBe(false);
  });
});
