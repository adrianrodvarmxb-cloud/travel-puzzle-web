// REQ-1347: I/O del workflow «Publicar viajes de una agencia». No habla con D1: lee la salida de wrangler, revisa y arma SQL.
//   npx tsx src/scripts/publicar-viajes.ts preparar <filas.json> <dir> <base-url>
//     → respaldo.json (filas completas), plan.json, publicar.sql, regreso.sql, rutas.txt; imprime el resumen en markdown
//   npx tsx src/scripts/publicar-viajes.ts verificar <despues.json> <plan.json>  → exit 1 si no quedaron publicados los del plan
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { checkForPublish, parseD1TripRow, publishSql, restoreSql } from "../trips/lib/publish-batch";
import { imageUrl } from "../trips/lib/image";
import { tripPath } from "../trips/lib/public";

const [cmd, a, b, c] = process.argv.slice(2);
const results = (file: string) => (JSON.parse(readFileSync(file, "utf8")) as { results: Record<string, unknown>[] }[])[0]?.results ?? [];

async function imageOk(base: string, key: string): Promise<boolean> {
  try {
    const r = await fetch(new URL(imageUrl(key), base), { method: "GET" });
    return r.ok && (r.headers.get("content-type") ?? "").startsWith("image/");
  } catch { return false; }
}

async function main() {
  if (cmd === "preparar") {
    const rows = results(a);
    mkdirSync(b, { recursive: true });
    const agencies = [...new Set(rows.map((r) => String(r.agencyId)))];
    if (agencies.length !== 1) throw new Error(`se esperaba una sola agencia; hay ${agencies.length}`);
    const publicar: { id: string; slug: string; path: string }[] = [];
    const omitir: { id: string; slug: string; faltan: string[] }[] = [];
    for (const r of rows) {
      const t = parseD1TripRow(r);
      const faltan = checkForPublish(t);
      for (const img of t.images) if (img.key && !(await imageOk(c, img.key))) faltan.push(`foto no responde (${img.key})`);
      if (t.status !== "draft") faltan.push(`status ${t.status}`);
      if (faltan.length) omitir.push({ id: t.id, slug: t.slug, faltan });
      else publicar.push({ id: t.id, slug: t.slug, path: tripPath({ slug: t.slug, countries: t.countries as string[] }) });
    }
    const now = new Date().toISOString().replace("Z", "+00:00");
    const ids = new Set(publicar.map((p) => p.id));
    writeFileSync(join(b, "respaldo.json"), JSON.stringify(rows, null, 1));
    writeFileSync(join(b, "plan.json"), JSON.stringify({ agencyId: agencies[0], publicar, omitir }, null, 1));
    writeFileSync(join(b, "publicar.sql"), publishSql([...ids], agencies[0], now).join("\n") + "\n");
    writeFileSync(join(b, "regreso.sql"), restoreSql(rows.filter((r) => ids.has(String(r.id))).map((r) => parseD1TripRow(r))).join("\n") + "\n");
    writeFileSync(join(b, "rutas.txt"), publicar.map((p) => p.path).join("\n") + "\n");
    console.log(`## Revisión previa (REQ-1347)\n- filas en draft: ${rows.length}\n- se publican: ${publicar.length}\n- no se publican: ${omitir.length}`);
    for (const o of omitir) console.log(`  - \`${o.slug}\`: falta ${o.faltan.join(", ")}`);
    return;
  }
  if (cmd === "verificar") {
    const plan = JSON.parse(readFileSync(b, "utf8")) as { publicar: { id: string }[] };
    const status = new Map(results(a).map((r) => [String(r.id), String(r.status)]));
    const mal = plan.publicar.filter((p) => status.get(p.id) !== "published");
    console.log(`Publicados según D1: ${plan.publicar.length - mal.length} de ${plan.publicar.length}`);
    if (mal.length) { console.error(`No quedaron publicados: ${mal.map((m) => m.id).join(", ")}`); process.exit(1); }
    return;
  }
  throw new Error(`comando desconocido: ${cmd}`);
}

main().catch((e) => { console.error((e as Error).message); process.exit(1); });
