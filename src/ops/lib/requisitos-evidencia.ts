// REQ-3530: ningún requisito de tipo CÓDIGO puede quedar CUMPLIDO sin una prueba que cite su folio
// (punto 4 del protocolo de trazabilidad de CLAUDE.md: «Prohibido marcar CUMPLIDO sin test verde»).
// Lo que no se puede probar con una prueba unitaria (una tarea programada, una corrida en producción,
// un deploy) lo declara en su estado con `sin prueba unitaria:` y la evidencia que sí tiene.
// Lógica pura: recibe texto y devuelve folios; no hace I/O.

export type FilaRequisito = {
  id: string;
  tipo: string;
  estado: string;
};

/** Marca explícita para el requisito de código cuya evidencia no es una prueba unitaria. */
export const EVIDENCIA_DECLARADA = "sin prueba unitaria:";

const TIPOS = ["CÓDIGO", "BANDERA", "DEFINICIÓN", "VALIDACIÓN", "TAREA-PO", "DATOS", "PLAN", "PRUEBA"];

/** Parte una fila de la tabla de `docs/requisitos.md` en celdas, sin los pipes de los extremos. */
export function celdas(linea: string): string[] {
  return linea.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/** REQ-3530: lee las filas `| REQ-### | … |`. El tipo es la celda que lo nombra; el estado, la última. */
export function filasDeRequisitos(markdown: string): FilaRequisito[] {
  return markdown
    .split("\n")
    .filter((l) => /^\| REQ-\d+ /.test(l))
    .map((l) => {
      const c = celdas(l);
      return { id: c[0], tipo: TIPOS.find((t) => c.includes(t)) ?? "", estado: c[c.length - 1] };
    });
}

/** REQ-3530: los folios citados en el nombre de alguna prueba, p. ej. `it("REQ-014: …")`. */
export function foliosConPrueba(textoDePruebas: string): Set<string> {
  const folios = new Set<string>();
  for (const m of textoDePruebas.matchAll(/\b(?:it|test)\(\s*[`'"]\s*(REQ-\d+)/g)) folios.add(m[1]);
  return folios;
}

/** REQ-3530: folios de código marcados CUMPLIDO que no tienen prueba que los cite ni evidencia declarada. */
export function cumplidosSinEvidencia(filas: FilaRequisito[], conPrueba: Set<string>): string[] {
  return filas
    .filter((f) => f.tipo === "CÓDIGO")
    .filter((f) => f.estado.startsWith("CUMPLIDO"))
    .filter((f) => !conPrueba.has(f.id))
    .filter((f) => !f.estado.includes(EVIDENCIA_DECLARADA))
    .map((f) => f.id);
}
