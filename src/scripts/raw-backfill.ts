/**
 * REQ-567 (Ola R4): respaldo RETROACTIVO de la copia exacta, SOLO preparado. Por omisión es ENSAYO: no escribe nada,
 * solo calcula el plan, mide tamaños y lista los documentos originales que faltan. Nunca sube nada a R2 ni a D1.
 *
 *   npx tsx src/scripts/raw-backfill.ts [--docs <carpeta de PDF>] [--reporte <archivo.json>]
 *        [--salida <carpeta>] [--freetour-paginas <carpeta con páginas guardadas de /tours>] [--solo imports/<archivo>.json]
 *
 * --salida escribe los objetos (raw/… y source/…), crudo.sql y subir.sh (comandos de wrangler, sin correr) en una
 *   carpeta FUERA del repo (o en tmp/, que está en .gitignore). La copia exacta lleva netos: nunca va al repo.
 * --freetour-paginas solo MIDE (FREETOUR se respalda encendiendo RAW_ARCHIVE_ENABLED: el siguiente sync diario ya
 *   recorre /tours completo y guarda la versión 1 de cada tour, sin otro login ni más carga a la API, E4).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { documentFor, planImportArchive, providerOfAgency, recordSql, type SourceDocument } from "../ingest/lib/import-archive";
import { matchDocument, pageOf, unclaimed, type InventoryRow } from "../ingest/lib/backfill-plan";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const docsDir = arg("--docs");
const out = arg("--salida");
const reportFile = arg("--reporte");
const ftPages = arg("--freetour-paginas");
/** --solo imports/<archivo>.json: solo ese archivo (lo usa el workflow de respaldo). */
const only = arg("--solo")?.split("/").pop();

function guardOutside(dir: string) {
  const repo = resolve(".");
  const rel = relative(repo, resolve(dir));
  const inside = !rel.startsWith("..") && !rel.startsWith("/");
  if (inside && !rel.startsWith("tmp/") && rel !== "tmp") throw new Error(`--salida ${dir} está dentro del repo: usa una carpeta fuera o tmp/ (la copia exacta nunca se commitea)`);
}

const pagesCache = new Map<string, string[]>();
function pdfPages(file: string): string[] {
  if (!pagesCache.has(file)) {
    try { pagesCache.set(file, execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).split("\f")); }
    catch { pagesCache.set(file, []); }
  }
  return pagesCache.get(file)!;
}

async function main() {
  if (out) guardOutside(out);
  const now = new Date();
  const files = docsDir ? readdirSync(docsDir).filter((f) => /\.(pdf|html?)$/i.test(f)).map((f) => join(docsDir, f)) : [];
  const inventory: InventoryRow[] = [];
  const sizes: Record<string, { items: number; bytes: number; gzip: number; docs: number; docBytes: number }> = {};
  const docs = new Map<string, SourceDocument>();
  const sql: string[] = [];
  const objects: { key: string; data: string | Uint8Array }[] = [];

  for (const f of readdirSync("imports").filter((x) => x.endsWith(".json") && (!only || x === only)).sort()) {
    const bundle = JSON.parse(readFileSync(join("imports", f), "utf8"));
    const provider = providerOfAgency(bundle.agency.id);
    if (!provider) { console.log(`SIN PROVEEDOR ${f}`); continue; }
    const docsByRef = new Map<string, { key: string; page: number | null }>();
    for (const e of bundle.trips) {
      const m = matchDocument(provider, e, files);
      const page = m.kind === "pdf" && m.file ? pageOf(pdfPages(m.file), m.pageToken) : null;
      inventory.push({ provider, ref: e.ref, kind: m.kind, file: m.file, url: m.url, page, note: m.note || (m.kind === "pdf" && page === null ? "página por confirmar" : "") });
      if (m.kind === "pdf" && m.file) {
        if (!docs.has(m.file)) docs.set(m.file, await documentFor(provider, m.file.split("/").pop()!, new Uint8Array(readFileSync(m.file)), now));
        docsByRef.set(e.ref, { key: docs.get(m.file)!.key, page });
      }
    }
    const plan = await planImportArchive(bundle, { runId: `respaldo:${f}:${now.toISOString()}`, now, docsByRef });
    const s = (sizes[provider] ??= { items: 0, bytes: 0, gzip: 0, docs: 0, docBytes: 0 });
    for (const w of plan.writes) { s.items++; s.bytes += w.row.bytes; s.gzip += gzipSync(w.body).length; objects.push({ key: w.key, data: w.body }); }
    sql.push(...recordSql(plan.writes.map((w) => w.row)));
  }
  for (const d of docs.values()) { sizes[d.provider].docs++; sizes[d.provider].docBytes += d.bytes; sql.unshift(...recordSql([], d)); objects.push({ key: d.key, data: d.data }); }

  let freetour: Record<string, number> | null = null;
  if (ftPages && existsSync(ftPages)) {
    const items = readdirSync(ftPages).filter((x) => x.endsWith(".json")).flatMap((p) => {
      const b = JSON.parse(readFileSync(join(ftPages, p), "utf8"));
      const list = b?.data?.tours ?? b?.data ?? b;
      return Array.isArray(list) ? list : [];
    });
    const bytes = items.map((x) => Buffer.byteLength(JSON.stringify(x)));
    const gz = items.map((x) => gzipSync(JSON.stringify(x)).length);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    freetour = { items: items.length, promedioBytes: Math.round(sum(bytes) / Math.max(1, items.length)), promedioGzip: Math.round(sum(gz) / Math.max(1, items.length)), maxBytes: Math.max(0, ...bytes) };
  }

  const missing = inventory.filter((r) => r.kind !== "pdf");
  const noPage = inventory.filter((r) => r.kind === "pdf" && r.page === null);
  const report = { generado: now.toISOString(), ensayo: !out, tamanos: sizes, freetour, documentos: docs.size, faltan: missing, sinPagina: noPage.map((r) => `${r.provider}:${r.ref}`), noReclamados: unclaimed(files, inventory).map((f) => f.split("/").pop()) };

  console.log(`${out ? "PREPARADO" : "ENSAYO"} · ${objects.length} objetos (${inventory.length} viajes + ${docs.size} documentos) · nada se sube`);
  for (const [p, s] of Object.entries(sizes)) console.log(`${p.padEnd(16)} ${String(s.items).padStart(4)} items ${(s.bytes / 1024).toFixed(0).padStart(6)} KB (gzip ${(s.gzip / 1024).toFixed(0)} KB) · ${s.docs} documentos ${(s.docBytes / 1048576).toFixed(1)} MB`);
  if (freetour) console.log(`freetour (medición local) ${JSON.stringify(freetour)}`);
  const byProv = (rows: InventoryRow[]) => Object.entries(rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.provider]: (a[r.provider] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(`sin documento original: ${missing.length} (${byProv(missing)})`);
  console.log(`con PDF pero sin página: ${noPage.length} (${byProv(noPage)})`);
  if (report.noReclamados.length) console.log(`documentos sin viaje: ${report.noReclamados.join(", ")}`);
  if (reportFile) { guardOutside(reportFile); writeFileSync(reportFile, JSON.stringify(report, null, 2)); }

  if (out) {
    for (const o of objects) { const p = join(out, "objetos", o.key); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, o.data); }
    writeFileSync(join(out, "crudo.sql"), sql.join("\n") + "\n");
    writeFileSync(join(out, "subir.sh"), [
      "#!/usr/bin/env bash", "# REQ-567: NO correr sin OK del PO (candados: bucket travel-puzzle-raw, binding, migración 0022, RAW_ARCHIVE_ENABLED).",
      "# Orden: primero R2 privado, luego el índice en D1. Ver docs/runbooks/copia-exacta.md.", "set -euo pipefail", 'cd "$(dirname "$0")/objetos"',
      ...objects.map((o) => `npx wrangler r2 object put "travel-puzzle-raw/${o.key}" --file "${o.key}" --remote`),
      "cd ..", "npx wrangler d1 execute travel-puzzle --remote --file crudo.sql", "",
    ].join("\n"));
    console.log(`escrito en ${out}/ (objetos, crudo.sql, subir.sh). No se subió nada.`);
  }
}
main().catch((e) => { console.log(`Error: ${e.message}`); process.exit(1); });
