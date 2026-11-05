/**
 * REQ-039: prepara la carga de viajes de un operador (lo corre el workflow "Importar viajes").
 *   npx tsx src/scripts/import-trips.ts <archivo.json> <carpeta-salida> [carpeta-fotos-operador]
 * Baja las fotos (Pixabay por id con PIXABAY_API_KEY, o archivos del operador), valida cada viaje con el
 * mismo esquema del gestor y escribe import.sql + fotos/<llave> + reporte.json. No toca producción.
 * Variables: PIXABAY_API_KEY, NOW_SAMPLE (fecha de una fila existente para copiar su formato).
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { tripInputSchema } from "../trips/schemas/trip";
import { buildImportSql, formatLike, type ImportAgency } from "../trips/lib/bulk-import";
import { IMAGE_KEY_RE } from "../trips/lib/image";

type Photo = { src: "pixabay"; id: number; alt: string } | { src: "inca"; file: string; alt: string };
interface Entry { ref: string; status: "draft" | "published"; photos: Photo[]; trip: Record<string, unknown> }
interface Bundle { agency: ImportAgency; keyStamp: number; seqStart?: number; trips: Entry[] }

const [input, out, operatorDir = ""] = process.argv.slice(2);
if (!input || !out) { console.log("Uso: import-trips.ts <archivo.json> <salida> [fotos-operador]"); process.exit(1); }
const bundle = JSON.parse(readFileSync(input, "utf8")) as Bundle;
mkdirSync(join(out, "fotos", "trips"), { recursive: true });

const ext = (p: Photo) => (p.src === "inca" ? extname(p.file).slice(1).replace("jpeg", "jpg") : "jpg");
const keyFor = (ref: string, n: number, p: Photo) =>
  `trips/${bundle.keyStamp}-${`${bundle.agency.initials}${ref}${n}`.toLowerCase().replace(/[^a-z0-9]/g, "")}.${ext(p)}`;

async function fetchPixabay(id: number, dest: string) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error("Falta PIXABAY_API_KEY");
  const r = await fetch(`https://pixabay.com/api/?key=${key}&id=${id}`);
  if (!r.ok) throw new Error(`Pixabay ${id}: HTTP ${r.status}`);
  const hit = (await r.json()).hits?.[0];
  if (!hit) throw new Error(`Pixabay ${id}: sin resultado`);
  const img = await fetch(hit.largeImageURL);
  if (!img.ok) throw new Error(`Pixabay ${id}: imagen HTTP ${img.status}`);
  writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
}

async function main() {
  const rows = [];
  const errors: string[] = [];
  for (const e of bundle.trips) {
    const images = [];
    for (const [n, p] of e.photos.entries()) {
      const key = keyFor(e.ref, n + 1, p);
      if (!IMAGE_KEY_RE.test(key)) { errors.push(`${e.ref}: llave inválida ${key}`); continue; }
      const dest = join(out, "fotos", key);
      mkdirSync(dirname(dest), { recursive: true });
      try {
        if (!existsSync(dest)) {
          if (p.src === "pixabay") await fetchPixabay(p.id, dest);
          else copyFileSync(join(operatorDir, p.file), dest);
        }
        images.push({ key, alt: p.alt.slice(0, 160) });
      } catch (err) { errors.push(`${e.ref}: ${(err as Error).message}`); }
    }
    const parsed = tripInputSchema.safeParse({ ...e.trip, images });
    if (!parsed.success) { errors.push(`${e.ref}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`); continue; }
    rows.push({ ref: e.ref, status: e.status, trip: parsed.data });
  }
  const sample = process.env.NOW_SAMPLE ?? "";
  const now = formatLike(/^\d+$/.test(sample) ? Number(sample) : sample, new Date());
  const { sql, report } = buildImportSql(rows, bundle.agency, now, bundle.seqStart ?? 1);
  writeFileSync(join(out, "import.sql"), sql.join("\n") + "\n");
  writeFileSync(join(out, "reporte.json"), JSON.stringify({ errors, report }, null, 2));
  for (const r of report) console.log(`${r.ref.padEnd(8)} ${r.code.padEnd(16)} ${r.status.padEnd(9)} ${r.missing.join(", ")}`);
  console.log(`\n${report.length} viajes · ${report.filter((r) => r.status === "published").length} publicados · ${errors.length} errores`);
  errors.forEach((x) => console.log(`ERROR ${x}`));
  if (errors.length) process.exit(1);
}
main().catch((e) => { console.log(`Error: ${e.message}`); process.exit(1); });
