/**
 * REQ-10742: inventario completo de lo que no está cerrado y qué lo detiene. Solo lectura.
 * Uso: npx tsx src/scripts/dependencias-detenidas.ts  (escribe docs/dependencias-detenidas-inventario.md)
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Fila = { id: string; tipo: string; estado: string; detalle: string; texto: string; bloqueadoPor: string[] };
const CERRADO = /^(CUMPLIDO|REEMPLAZADO|DECIDIDO|CANCELADO|DESCARTADO)\b(?![^|]*\b(PENDIENTE|falta|faltan)\b)/i;

/** Qué detiene una fila, por las palabras de su estado. El orden importa: la primera que aplica gana. */
export function motivo(estado: string, tipo = "", bloqueoAbierto: string[] = []): string {
  const e = estado.toLowerCase();
  if (bloqueoAbierto.length > 0) return "Depende de otro folio sin cerrar";
  if (/abogad|legal|revisi[oó]n jur/.test(e)) return "Abogado";
  if (/proveedor|tangol|freetour|extime|exotic|hotelbeds|bemyguest|ventrata|meta\b|respuesta de|espera (a |la respuesta)/.test(e) && /espera|respuesta|falta que|sin respuesta|bloquead/.test(e)) return "Tercero (proveedor u otra empresa)";
  if (/secreto|variable|token|clave|credencial/.test(e)) return "Secreto o variable por cargar";
  if (/ok del po|firma del po|espera al po|decisi[oó]n del po|el po |candado|para firma|definici[oó]n del po/.test(e)) return "Decisión, firma u OK del PO";
  if (/borrador|sin construir|sin plan|falta el plan|sin c[oó]digo|sin ruta|sin iniciar|c[oó]digo pendiente|construcci[oó]n pendiente|falta construir|falta mostrar|depende de|no cumplido/.test(e)) return "Pieza sin construir o en borrador";
  if (/ola \d|modelo com[uú]n|plantilla nueva/.test(e)) return "Ola posterior del plan";
  if (/humo|preview|merge|fusion|publicar|sin publicar|en rama|pr #/.test(e)) return "Falta publicar (PR, humo o merge)";
  if (/datos|carga|migraci[oó]n/.test(e)) return "Carga de datos o migración";
  if (tipo === "TAREA-PO") return "Tarea a mano del PO";
  if (tipo === "DEFINICIÓN" || tipo === "VALIDACIÓN") return "Decisión, firma u OK del PO";
  if (tipo === "BANDERA") return "Bandera apagada sin motivo escrito";
  if (/^pendiente/.test(e)) return "Sin iniciar (el estado no dice qué falta)";
  if (/^en curso/.test(e)) return "A medias (el estado no dice qué falta)";
  return "Sin clasificar (revisar a mano)";
}

function filas(md: string): Fila[] {
  const out: Fila[] = [];
  for (const l of md.split("\n")) {
    if (!l.startsWith("| REQ-")) continue;
    const p = l.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((x) => x.trim());
    if (p.length < 4) continue;
    const tipo = /^(CÓDIGO|BANDERA|DEFINICIÓN|VALIDACIÓN|TAREA-PO|DATOS|TAREA|PRUEBA)\b/.exec(p[1])?.[1] ?? "(tabla vieja)";
    const bloqueadoPor = p.length >= 6 ? [...p[p.length - 2].matchAll(/REQ-\d+/g)].map((m) => m[0]) : [];
    out.push({ id: p[0], tipo, estado: p[p.length - 1], detalle: p[2].slice(0, 110), texto: l, bloqueadoPor });
  }
  return out;
}

if (process.argv[1]?.endsWith("dependencias-detenidas.ts")) {
  const req = filas(readFileSync("docs/requisitos.md", "utf8"));
  const abiertas = req.filter((f) => !CERRADO.test(f.estado));
  const grupos = new Map<string, Fila[]>();
  const cerradas = new Set(req.filter((f) => CERRADO.test(f.estado)).map((f) => f.id));
  const abiertoDe = (f: Fila) => f.bloqueadoPor.filter((id) => id !== f.id && !cerradas.has(id));
  for (const f of abiertas) { const m = motivo(f.estado, f.tipo, abiertoDe(f)); grupos.set(m, [...(grupos.get(m) ?? []), f]); }

  const wr = readFileSync("wrangler.jsonc", "utf8");
  const banderas = [...wr.matchAll(/"([A-Z0-9_]+)":\s*"(false|)"/g)].map((m) => ({ nombre: m[1], valor: m[2] === "" ? "vacía" : "apagada", donde: "wrangler.jsonc" }));
  for (const f of readdirSync(".github/workflows")) {
    const y = readFileSync(join(".github/workflows", f), "utf8");
    for (const m of new Set([...y.matchAll(/([A-Z0-9_]+_(?:ENABLED|ON)):\s*"?false"?/g)].map((x) => x[1]))) banderas.push({ nombre: m, valor: "apagada", donde: f });
  }
  const md: string[] = [
    "# Inventario completo de lo que no está cerrado (REQ-10742)", "",
    "Generado por `npx tsx src/scripts/dependencias-detenidas.ts` desde `docs/requisitos.md`, `wrangler.jsonc` y los workflows. No se edita a mano. El motivo sale de las palabras del estado de cada fila; «Sin clasificar» se revisa a mano.", "",
    `Filas de requisitos: ${req.length} · sin cerrar: ${abiertas.length}`, "", "## Resumen por motivo", "", "| Qué lo detiene | Filas |", "|---|---|",
    ...[...grupos.entries()].sort((a, b) => b[1].length - a[1].length).map(([m, fs]) => `| ${m} | ${fs.length} |`), "",
    "## Banderas apagadas y variables vacías", "", "| Bandera o variable | Estado | Dónde | Folio que la nombra | Estado del folio |", "|---|---|---|---|---|",
    ...banderas.map((b) => { const f = req.filter((r) => r.texto.includes(b.nombre)); const u = f[f.length - 1]; return `| \`${b.nombre}\` | ${b.valor} | ${b.donde} | ${u?.id ?? "**sin folio**"} | ${(u?.estado ?? "—").slice(0, 160).replace(/\|/g, "/")} |`; }),
  ];
  for (const [m, fs] of [...grupos.entries()].sort((a, b) => b[1].length - a[1].length)) {
    md.push("", `## ${m} (${fs.length})`, "", "| Folio | Tipo | Depende de | Estado |", "|---|---|---|---|");
    for (const f of fs) md.push(`| ${f.id} | ${f.tipo} | ${abiertoDe(f).join(", ") || "—"} | ${f.estado.slice(0, 220).replace(/\|/g, "/")} |`);
  }
  writeFileSync("docs/dependencias-detenidas-inventario.md", md.join("\n") + "\n");
  console.log(md.slice(4, 8 + grupos.size + 3).join("\n"));
  console.log(banderas.filter((b) => !req.some((r) => r.texto.includes(b.nombre))).map((b) => "sin folio: " + b.nombre).join("\n"));
}
