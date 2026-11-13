// REQ-3530: ningún REQ de tipo CÓDIGO queda CUMPLIDO sin prueba que cite su folio o evidencia declarada.
// npx vitest run src/ops/requisitos-evidencia.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { EVIDENCIA_DECLARADA, cumplidosSinEvidencia, filasDeRequisitos, foliosConPrueba } from "./lib/requisitos-evidencia";

function archivosDePrueba(raiz: string, acc: string[] = []): string[] {
  for (const nombre of readdirSync(raiz)) {
    const ruta = join(raiz, nombre);
    if (statSync(ruta).isDirectory()) archivosDePrueba(ruta, acc);
    else if (/\.test\.(ts|tsx|js)$/.test(nombre)) acc.push(ruta);
  }
  return acc;
}

const markdown = readFileSync("docs/requisitos.md", "utf8");
const textoDePruebas = ["src", "gateway"].flatMap((d) => archivosDePrueba(d)).map((f) => readFileSync(f, "utf8")).join("\n");

describe("REQ-3530: evidencia obligatoria de los requisitos de código", () => {
  it("REQ-3530: un CUMPLIDO de código sin prueba sale en la lista; con prueba que lo cite, no", () => {
    const filas = filasDeRequisitos(
      "| REQ-900 | CÓDIGO | algo | agente | — | CUMPLIDO |\n| REQ-901 | CÓDIGO | algo | agente | — | CUMPLIDO |\n",
    );
    expect(cumplidosSinEvidencia(filas, new Set(["REQ-901"]))).toEqual(["REQ-900"]);
  });

  it(`REQ-3530: «${EVIDENCIA_DECLARADA}» en el estado vale como evidencia cuando no hay prueba unitaria posible`, () => {
    const filas = filasDeRequisitos(
      "| REQ-902 | CÓDIGO | tarea programada | agente | — | CUMPLIDO (sin prueba unitaria: corrida 43213277304 en verde) |\n",
    );
    expect(cumplidosSinEvidencia(filas, new Set())).toEqual([]);
  });

  it("REQ-3530: EN CURSO, PENDIENTE, SIN VERIFICAR y los tipos que no son CÓDIGO quedan fuera de la guarda", () => {
    const filas = filasDeRequisitos(
      "| REQ-903 | CÓDIGO | algo | agente | — | EN CURSO |\n" +
        "| REQ-904 | CÓDIGO | algo | agente | — | PENDIENTE |\n" +
        "| REQ-905 | CÓDIGO | algo | agente | — | SIN VERIFICAR (sin prueba que cite el folio) |\n" +
        "| REQ-906 | DEFINICIÓN | algo | PO | — | CUMPLIDO |\n" +
        "| REQ-907 | TAREA-PO | algo | PO | — | CUMPLIDO |\n",
    );
    expect(cumplidosSinEvidencia(filas, new Set())).toEqual([]);
  });

  it("REQ-3530: reconoce el folio en nombres con comilla simple, doble y plantilla", () => {
    const folios = foliosConPrueba(
      `it("REQ-010: uno", () => {});\n` + `it('REQ-011: dos', () => {});\n` + "it(`REQ-012: ${f} tres`, () => {});\n" + `test("REQ-013: cuatro", () => {});\n`,
    );
    expect([...folios].sort()).toEqual(["REQ-010", "REQ-011", "REQ-012", "REQ-013"]);
  });

  it("REQ-3530: en este repo, ningún REQ de código está CUMPLIDO sin prueba que lo cite ni evidencia declarada", () => {
    expect(cumplidosSinEvidencia(filasDeRequisitos(markdown), foliosConPrueba(textoDePruebas))).toEqual([]);
  });
});
