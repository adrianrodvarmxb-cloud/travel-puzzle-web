// REQ-10656: tabla de equivalencias de dificultad de Tangol para la firma del PO (gate REQ-10657). Solo lectura.
// Uso: npx tsx src/scripts/dificultad-tangol.ts <conteos.json>
//   conteos.json = [{ "texto": "<difficulty>", "n": <conteo> }, …], como lo da
//   SELECT difficulty AS texto, COUNT(*) AS n FROM "Tour" WHERE "providerId"='tangol' GROUP BY difficulty
// Imprime Markdown: resumen por nivel, la tabla texto → nivel y la lista de dudas. No toca D1 ni archivos del repo.
import { readFileSync } from "node:fs";
import { TABLA_DIFICULTAD_TANGOL, resumenDificultad, type ConteoTexto } from "../taxonomy/lib/difficulty";

const NOMBRES: Record<number, string> = { 1: "Relajado", 2: "Ligero", 3: "Moderado", 4: "Exigente", 5: "Muy exigente" };
const celda = (s: string | null) => (s ?? "(sin dato)").replace(/\r?\n/g, " ⏎ ").replace(/\|/g, "\\|").slice(0, 120);

export function tablaMarkdown(conteos: readonly ConteoTexto[]): string {
  const r = resumenDificultad(conteos);
  const total = conteos.reduce((a, c) => a + c.n, 0);
  const conNivel = Object.values(r.porNivel).reduce((a, b) => a + b, 0);
  const enDuda = r.dudas.reduce((a, d) => a + d.n, 0);
  const lineas: string[] = [];
  lineas.push(`Tours de Tangol: ${total} · con nivel: ${conNivel} · dudas: ${enDuda} (${r.dudas.length} textos distintos) · sin dato: ${r.sinDato}`, "");
  lineas.push("| Nivel | Nombre | Tours |", "|---|---|---|");
  for (const n of [1, 2, 3, 4, 5] as const) lineas.push(`| ${n} | ${NOMBRES[n]} | ${r.porNivel[n]} |`);
  lineas.push("", "### Tabla de equivalencias (filas de la tabla, en orden de prioridad)", "", "| Fila | Nivel | Términos reconocidos |", "|---|---|---|");
  for (const f of TABLA_DIFICULTAD_TANGOL) lineas.push(`| ${f.nombre} | ${f.nivel} ${NOMBRES[f.nivel]} | ${f.palabras.join(" · ")} |`);
  lineas.push("", "### Texto del proveedor → nivel", "", "| Texto de Tangol | Tours | Nivel | Regla |", "|---|---|---|---|");
  for (const f of r.filas.filter((x) => x.texto !== null && x.nivel !== null).sort((a, b) => b.n - a.n)) {
    lineas.push(`| ${celda(f.texto)} | ${f.n} | ${f.nivel} ${NOMBRES[f.nivel!]} | ${f.regla} |`);
  }
  lineas.push("", "### Dudas (no se muestran hasta que el PO decida)", "", "| Texto de Tangol | Tours |", "|---|---|");
  for (const d of r.dudas) lineas.push(`| ${celda(d.texto)} | ${d.n} |`);
  return lineas.join("\n");
}

if (process.argv[1]?.endsWith("dificultad-tangol.ts")) {
  const archivo = process.argv[2];
  if (!archivo) { console.error("Uso: npx tsx src/scripts/dificultad-tangol.ts <conteos.json>"); process.exit(2); }
  const conteos = JSON.parse(readFileSync(archivo, "utf8")) as ConteoTexto[];
  console.log(tablaMarkdown(conteos));
}
