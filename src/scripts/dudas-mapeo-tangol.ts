// REQ-10688: lista de dudas del mapeo de Tangol (decisión 13 de la ficha única) para la firma del PO (gate REQ-10689).
// Solo lectura: lee `src/taxonomy/data/mapping/tangol.json` y la tabla real de tipos del fixture; no toca D1 ni archivos.
// Uso: npx tsx src/scripts/dudas-mapeo-tangol.ts [tipos.json]   (por omisión tests/fixtures/tangol-tipos-2026-11-12.json)
// Imprime Markdown: resumen, gates A/B con su recomendación y la tabla de dudas con los tours que toca cada una.
import { readFileSync } from "node:fs";
import tangol from "../taxonomy/data/mapping/tangol.json";
import { parseMapping } from "../taxonomy/schemas/dictionary";
import { GATES_DUDAS_TANGOL, dudasDelMapeo, resumenDudas, type DudaMapeo, type TipoTangol } from "../taxonomy/lib/dudas-mapeo";

const celda = (s: string) => s.replace(/\r?\n/g, " ⏎ ").replace(/\|/g, "\\|");

export function dudasMarkdown(tipos: readonly TipoTangol[]): string {
  const mapping = parseMapping(tangol);
  const dudas = dudasDelMapeo(mapping, tipos);
  const r = resumenDudas(mapping, tipos);
  const porId = new Map<string, DudaMapeo>(dudas.map((d) => [d.id, d]));
  const l: string[] = [];
  l.push(`Categorías del mapeo: ${r.categorias} · con duda: ${r.dudas} · gates: ${r.gates} · tours que tocan las dudas: ${r.toursTocados} de ${r.toursTotal} leídos (corrida de solo lectura REQ-3487, 12 nov 2026)`, "");
  l.push("## Gates para el PO (REQ-10689)", "", "| Gate | Pregunta | Categorías (tours) | A (hoy o cambio mínimo) | B | Recomendada | Por qué |", "|---|---|---|---|---|---|---|");
  for (const g of GATES_DUDAS_TANGOL) {
    const cats = g.categorias.map((id) => `${id} ${porId.get(id)?.nombre ?? ""} (${porId.get(id)?.tours ?? 0})`).join("; ");
    l.push(`| ${g.gate} | ${celda(g.pregunta)} | ${celda(cats)} | ${celda(g.a)} | ${celda(g.b)} | **${g.recomendada}** | ${celda(g.porQue)} |`);
  }
  l.push("", "## Dudas tal como quedaron en el mapeo (REQ-3502, PR #459)", "", "| Categoría | Nombre | Hoy (formato · temas · atributos) | Pares de Tangol | Tours | Duda |", "|---|---|---|---|---|---|");
  for (const d of dudas) {
    const hoy = [d.formato, d.temas.join(", ") || "—", d.atributos.join(", ") || "—"].join(" · ");
    l.push(`| ${d.id} | ${celda(d.nombre)} | ${celda(hoy)} | ${d.pares.join(", ") || "— (red de seguridad)"} | ${d.tours} | ${celda(d.pendiente)} |`);
  }
  return l.join("\n");
}

if (process.argv[1]?.endsWith("dudas-mapeo-tangol.ts")) {
  const archivo = process.argv[2] ?? "tests/fixtures/tangol-tipos-2026-11-12.json";
  const fixture = JSON.parse(readFileSync(archivo, "utf8")) as { tipos: TipoTangol[] };
  console.log(dudasMarkdown(fixture.tipos));
}
