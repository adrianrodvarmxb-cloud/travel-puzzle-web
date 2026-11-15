// REQ-10660: lista de cambios de la decisión 9 (aventura y senderismo con guía) para la firma del PO. Solo lectura.
// Uso: npx tsx src/scripts/aventura-senderismo.ts <tours.tsv>
//   tours.tsv con cabecera `p\tci\td\tti` (proveedor, slug de ciudad, minutos, título en español), como lo da
//   SELECT t.providerId, c.slug, t.durationMinutes, tr.title FROM Tour t … WHERE (tangol, 9000003) OR (freetour, 16)
// Imprime Markdown: conteos por veredicto y proveedor, la lista de los que cambian, los que se quedan y las dudas.
import { readFileSync } from "node:fs";
import { propuestaDecision9, type TourDecision9 } from "../taxonomy/lib/aventura-senderismo";

const NOMBRE_VEREDICTO = { cambia: "Cambia a Excursión de un día · Aventura · Montaña y senderismo", queda: "Se queda como Momentos de autor · Aventura", duda: "Duda: lo decide el PO" } as const;
const celda = (s: string | null) => (s ?? "").replace(/\|/g, "\\|").trim();
const horas = (m: number | null) => (m === null ? "" : m >= 1440 ? `${Math.round(m / 1440)} d` : `${Math.round((m / 60) * 10) / 10} h`);

export function leerTsv(texto: string): TourDecision9[] {
  const [cab, ...lineas] = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cols = cab.split("\t");
  const i = (n: string) => { const k = cols.indexOf(n); if (k < 0) throw new Error(`falta la columna ${n}`); return k; };
  const [ip, ici, id, iti] = [i("p"), i("ci"), i("d"), i("ti")];
  return lineas.map((l) => {
    const c = l.split("\t");
    const d = Number.parseInt(c[id] ?? "", 10);
    return { proveedor: c[ip], ciudad: c[ici] || null, minutos: Number.isFinite(d) ? d : null, titulo: c[iti] ?? "" };
  });
}

export function listaMarkdown(tours: readonly TourDecision9[]): string {
  const p = propuestaDecision9(tours);
  const out: string[] = [];
  out.push(`Tours revisados: ${tours.length} · cambian: ${p.conteo.cambia} · se quedan: ${p.conteo.queda} · dudas: ${p.conteo.duda}`, "");
  out.push("| Proveedor | Cambian | Se quedan | Dudas |", "|---|---|---|---|");
  for (const [prov, c] of Object.entries(p.porProveedor)) out.push(`| ${prov} | ${c.cambia} | ${c.queda} | ${c.duda} |`);
  for (const v of ["cambia", "duda", "queda"] as const) {
    const filas = p.filas.filter((f) => f.veredicto === v).sort((a, b) => `${a.proveedor}${a.ciudad}${a.titulo}`.localeCompare(`${b.proveedor}${b.ciudad}${b.titulo}`, "es"));
    out.push("", `### ${NOMBRE_VEREDICTO[v]} (${filas.length})`, "", "| Proveedor | Ciudad | Duración | Título | Regla |", "|---|---|---|---|---|");
    for (const f of filas) out.push(`| ${f.proveedor} | ${celda(f.ciudad)} | ${horas(f.minutos)} | ${celda(f.titulo)} | ${f.regla} |`);
  }
  return out.join("\n");
}

if (process.argv[1]?.endsWith("aventura-senderismo.ts")) {
  const archivo = process.argv[2];
  if (!archivo) { console.error("Uso: npx tsx src/scripts/aventura-senderismo.ts <tours.tsv>"); process.exit(2); }
  console.log(listaMarkdown(leerTsv(readFileSync(archivo, "utf8"))));
}
