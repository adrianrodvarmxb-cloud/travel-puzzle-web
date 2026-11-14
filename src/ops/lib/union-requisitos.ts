// REQ-3515: pieza pura del workflow «Actualizar PR en conflicto». Sin git, sin red, sin archivos.

/** Rutas que se agregan desde muchas sesiones y se unen con merge=union (REQ-3513). */
export const DOCUMENTOS_UNION = ["STATUS.md", "docs/requisitos.md"] as const;

/** true si el PR choca con main SOLO en los documentos de unión: esos se pueden actualizar solos. */
export function soloDocumentos(enConflicto: string[]): boolean {
  return enConflicto.length > 0 && enConflicto.every((f) => (DOCUMENTOS_UNION as readonly string[]).includes(f));
}

const idDeFila = (l: string): string | null => l.match(/^\| (REQ-\d+) /)?.[1] ?? null;

function filasPorId(lineas: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const l of lineas) {
    const id = idDeFila(l);
    if (id) m.set(id, [...(m.get(id) ?? []), l]);
  }
  return m;
}

/**
 * Tras una unión, una fila REQ editada en las dos ramas queda dos veces. Deja tantas como tenía el padre que más
 * tenía, prefiriendo la versión de la rama del PR, luego la de main. Las líneas que no son fila REQ no se tocan.
 */
export function dedupeReqRows(unido: string, rama: string, main: string): { text: string; removed: string[] } {
  const lineas = unido.split("\n");
  const enRama = filasPorId(rama.split("\n"));
  const enMain = filasPorId(main.split("\n"));
  const plan = new Map<string, Map<string, number>>();
  for (const [id, filas] of filasPorId(lineas)) {
    const r = enRama.get(id) ?? [];
    const m = enMain.get(id) ?? [];
    const tope = Math.max(r.length, m.length);
    if (filas.length <= tope) continue;
    const elegidas = [...filas.filter((f) => r.includes(f)), ...filas.filter((f) => !r.includes(f) && m.includes(f)), ...filas];
    const cupo = new Map<string, number>();
    for (const f of elegidas.slice(0, Math.max(tope, 1))) cupo.set(f, (cupo.get(f) ?? 0) + 1);
    plan.set(id, cupo);
  }
  const removed: string[] = [];
  const out = lineas.filter((l) => {
    const cupo = plan.get(idDeFila(l) ?? "");
    if (!cupo) return true;
    const n = cupo.get(l) ?? 0;
    if (n > 0) {
      cupo.set(l, n - 1);
      return true;
    }
    removed.push(l);
    return false;
  });
  return { text: out.join("\n"), removed };
}
