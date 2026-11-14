/**
 * REQ-10575: guarda la copia HTML de la página pública de cada producto de Big Bus (`source` de imports/bigbus-*.json)
 * en una carpeta FUERA del repo o en tmp/ (nunca se commitea). Un GET por página; solo se guarda una página 200
 * completa de bigbustours.com (`snapshotValido`); lo demás se reporta y el viaje sigue como hueco. No sube nada.
 *
 *   npx tsx src/scripts/bigbus-copias.ts <carpeta>
 * Después: npx tsx src/scripts/raw-backfill.ts --docs <carpeta> --solo imports/bigbus-2026.json
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { snapshotValido, webSnapshotName } from "../ingest/lib/backfill-plan";

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("uso: bigbus-copias.ts <carpeta>");
  const rel = relative(resolve("."), resolve(dir));
  if (!rel.startsWith("..") && !rel.startsWith("/") && !rel.startsWith("tmp/") && rel !== "tmp") throw new Error(`${dir} está dentro del repo: usa tmp/ o una carpeta fuera`);
  mkdirSync(dir, { recursive: true });
  let ok = 0, sin = 0;
  for (const f of readdirSync("imports").filter((x) => x.startsWith("bigbus") && x.endsWith(".json"))) {
    for (const e of JSON.parse(readFileSync(join("imports", f), "utf8")).trips) {
      if (typeof e.source !== "string" || !/^https?:\/\//.test(e.source)) { sin++; console.log(`SIN COPIA ${e.ref}: source sin URL`); continue; }
      const dest = join(dir, webSnapshotName(e.source));
      if (existsSync(dest)) { ok++; continue; }
      try {
        const res = await fetch(e.source, { redirect: "follow", headers: { accept: "text/html" } });
        const body = await res.text();
        const v = snapshotValido({ status: res.status, contentType: res.headers.get("content-type"), finalUrl: res.url || e.source, body });
        if (v.ok) { writeFileSync(dest, body); ok++; } else { sin++; console.log(`SIN COPIA ${e.ref}: ${v.motivo}`); }
      } catch (err) { sin++; console.log(`SIN COPIA ${e.ref}: ${(err as Error).message}`); }
    }
  }
  console.log(`copias de Big Bus: ${ok} guardadas, ${sin} sin copia · nada se sube`);
}
main().catch((e) => { console.log(`Error: ${e.message}`); process.exit(1); });
