/**
 * REQ-350…353: ENSAYO de la ingesta de alias (plan S5). Solo genera archivos: nunca escribe en D1.
 *   npx tsx src/scripts/alias-ingesta.ts <alternateNamesV2.txt | -> <carpeta-export> <carpeta-salida> [--map geo-v2-auto.csv] [--wikidata <respuesta.json>]
 * - alternateNamesV2.txt de GeoNames (CC BY 4.0) en streaming («-» = entrada estándar, p. ej. `unzip -p … | …`).
 * - <carpeta-export>/cities.json: export de D1 en SOLO LECTURA (id, countryId, geonameid).
 * - --map: si los geonameid aún no están en producción, el CSV del ensayo geo v2 (cityId → propuesto, status auto).
 * - --wikidata: respuesta JSON de WDQS a la consulta de `wikidataAliasQuery` (CC0).
 * Escribe destino-alias.csv, destino-alias.sql (INSERT OR IGNORE, para aplicar con OK del PO) y cobertura.json.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { aliasCsv, aliasSql, buildAliasRows, coverage, parseAlternateName, parseWikidataAliases, wikidataAliasQuery, type AltNameRow, type CityRef } from "../search/lib/alias-ingest";

const args = process.argv.slice(2);
const opt = (n: string) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : undefined);
const pos = args.filter((a, i) => !a.startsWith("--") && !["--map", "--wikidata"].includes(args[i - 1]));
const [altFile, input, out] = pos;
if (!altFile || !input || !out) { console.log("Uso: alias-ingesta.ts <alternateNamesV2.txt|-> <carpeta-export> <carpeta-salida> [--map geo-v2-auto.csv] [--wikidata <json>]"); process.exit(1); }
mkdirSync(out, { recursive: true });

function load<T>(file: string): T[] {
  const data = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(data) && data[0] && Array.isArray(data[0].results) ? data.flatMap((d: { results: T[] }) => d.results) : (data as T[]);
}
/** CSV simple con comillas (el del ensayo geo v2). */
function csvRows(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') inQ = false; else cell += c; continue; }
    if (c === '"') inQ = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

(async () => {
  const cities = load<{ id: number; countryId: number; geonameid?: number | null }>(join(input, "cities.json"));
  const map = new Map<number, number>();
  const mapFile = opt("--map");
  if (mapFile) for (const r of csvRows(readFileSync(mapFile, "utf8"))) if (r.status === "auto" && Number(r.propuesto) > 0) map.set(Number(r.cityId), Number(r.propuesto));
  const refs: CityRef[] = cities
    .map((c) => ({ cityId: Number(c.id), countryId: Number(c.countryId), geonameid: Number(c.geonameid) || map.get(Number(c.id)) || 0 }))
    .filter((c) => c.geonameid > 0);
  const wanted = new Set(refs.map((r) => r.geonameid));
  console.log(`Ciudades: ${cities.length}; con geonameid (guardado o --map): ${refs.length}`);

  const names: AltNameRow[] = [];
  let read = 0;
  const stream = altFile === "-" ? process.stdin : createReadStream(altFile);
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
    read++;
    const n = parseAlternateName(line);
    if (n && wanted.has(n.geonameid)) names.push(n);
  }
  const wdFile = opt("--wikidata");
  const wd = wdFile ? parseWikidataAliases(JSON.parse(readFileSync(wdFile, "utf8"))) : [];
  const rows = buildAliasRows(refs, [...names, ...wd]);
  const cov = coverage(rows, refs.length);
  writeFileSync(join(out, "destino-alias.csv"), aliasCsv(rows));
  writeFileSync(join(out, "destino-alias.sql"), aliasSql(rows));
  writeFileSync(join(out, "wikidata-consulta.sparql"), wikidataAliasQuery([...wanted]) + "\n");
  writeFileSync(join(out, "cobertura.json"), JSON.stringify({ lineasLeidas: read, ciudades: cities.length, conGeonameid: refs.length, nombresGeoNames: names.length, nombresWikidata: wd.length, filas: rows.length, porIdioma: cov }, null, 2) + "\n");
  console.log(`Líneas leídas: ${read}; filas de destino_alias: ${rows.length}`);
  console.log("Cobertura (ciudades con al menos un alias):", Object.entries(cov).map(([l, c]) => `${l} ${c.pct}%`).join(" · "));
})().catch((e) => { console.error("❌", (e as Error).message); process.exit(1); });
