/**
 * Ficha única, ola 4 «Geografía» (REQ-10740, REQ-10741). Lo corre el workflow «Geo: coordenadas de ciudad».
 * Simula por defecto: lee archivos y escribe archivos; NUNCA toca la base (eso lo hace el workflow, con bookmark).
 *
 *   npx tsx src/scripts/geo-coordenadas-ciudad.ts plan <cities15000.txt> <carpeta-export> <carpeta-salida>
 *     export/cities.json (id, geonameid, lat, lng, coordsSource) y export/tours.json (cityId, coords) como los deja
 *     `wrangler d1 execute --json`. Deja en la salida: coordenadas.sql, lote-NNN.sql, ensayo.sql, plan.csv, resumen.md.
 *   npx tsx src/scripts/geo-coordenadas-ciudad.ts restaurar <copia-city.json> <carpeta-salida>
 *     Deja restaurar.sql y lote-NNN.sql con la copia tal cual (REQ-10741). No lo ejecuta.
 *   npx tsx src/scripts/geo-coordenadas-ciudad.ts validar <archivo.sql> [restaurar]
 *     Sale con 1 si alguna línea no es de las permitidas.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { parseGeonamesLine } from "../destinations/lib/geonames";
import { toCsv } from "../destinations/lib/dry-run";
import {
  SQL_COORDENADAS_PERMITIDO,
  SQL_RESTAURAR_PERMITIDO,
  buildCoordenadasSql,
  buildRestaurarSql,
  lineaSqlCoordenadas,
  lineaSqlRestaurar,
  lineasSqlNoPermitidas,
  lotes,
  planCoordenadasCiudad,
  resumenPlan,
  sqlEnsayoCoordenadas,
  type CityExport,
} from "../geo/lib/coordenadas-ciudad";
import type { LatLng } from "../map/lib/coords";

const [cmd, ...rest] = process.argv.slice(2);

function load<T>(file: string): T[] {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (Array.isArray(data) && data.length && data[0] && Array.isArray(data[0].results)) return data.flatMap((d: { results: T[] }) => d.results);
  return data as T[];
}

async function geoIndex(file: string): Promise<Map<number, LatLng>> {
  const out = new Map<number, LatLng>();
  for await (const l of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
    const g = parseGeonamesLine(l);
    if (g) out.set(g.geonameid, { lat: g.lat, lng: g.lng });
  }
  return out;
}

function escribirLotes(dir: string, lineas: string[]) {
  lotes(lineas).forEach((l, i) => writeFileSync(join(dir, `lote-${String(i + 1).padStart(3, "0")}.sql`), l.join("\n") + "\n"));
}

async function plan([geonames, input, out]: string[]) {
  if (!geonames || !input || !out) throw new Error("Uso: plan <cities15000.txt> <carpeta-export> <carpeta-salida>");
  mkdirSync(out, { recursive: true });
  const cities = load<CityExport>(join(input, "cities.json"));
  const tours = load<{ cityId: number; coords: string | null }>(join(input, "tours.json")).map((t) => ({ cityId: Number(t.cityId), coords: t.coords ?? null }));
  const geo = await geoIndex(geonames);
  const p = planCoordenadasCiudad(cities, geo, tours);
  const hoy = new Date().toISOString();
  const sql = buildCoordenadasSql(p.plan, [`REQ-10740: coordenadas de ciudad desde GeoNames (cities15000) y mediana de puntos de encuentro. Generado ${hoy}.`, "Solo filas con lat IS NULL."]);
  const malas = lineasSqlNoPermitidas(sql);
  if (malas.length) throw new Error(`SQL con líneas no permitidas:\n${malas.join("\n")}`);
  writeFileSync(join(out, "coordenadas.sql"), sql);
  escribirLotes(out, p.plan.map(lineaSqlCoordenadas));
  writeFileSync(join(out, "ensayo.sql"), sqlEnsayoCoordenadas(p.plan) + "\n");
  writeFileSync(join(out, "plan.csv"), toCsv(p.plan.map((f) => ({ ...f }))));
  writeFileSync(join(out, "sin-dato.csv"), toCsv(p.sinDato.map((id) => ({ id }))));
  const resumen = `${resumenPlan(p)}\nGeoNames leídas: ${geo.size} filas. Ciudades exportadas: ${cities.length}. Tours leídos: ${tours.length}.\nLotes: ${lotes(p.plan).length}.`;
  writeFileSync(join(out, "resumen.md"), resumen + "\n");
  console.log(resumen);
  console.log(`esperadas=${p.plan.length}`);
}

function restaurar([copia, out]: string[]) {
  if (!copia || !out) throw new Error("Uso: restaurar <copia-city.json> <carpeta-salida>");
  mkdirSync(out, { recursive: true });
  const filas = load<CityExport>(copia);
  const sql = buildRestaurarSql(filas, [`REQ-10741: restauración de City (lat, lng, coordsSource) desde ${copia}. Generado ${new Date().toISOString()}.`]);
  const malas = lineasSqlNoPermitidas(sql, SQL_RESTAURAR_PERMITIDO);
  if (malas.length) throw new Error(`SQL de restauración con líneas no permitidas:\n${malas.join("\n")}`);
  writeFileSync(join(out, "restaurar.sql"), sql);
  escribirLotes(out, filas.map(lineaSqlRestaurar));
  console.log(`Restauración preparada (SIMULACIÓN, nada ejecutado): ${filas.length} filas en ${lotes(filas).length} lotes en ${out}.`);
}

function validar([archivo, modo]: string[]) {
  if (!archivo) throw new Error("Uso: validar <archivo.sql> [restaurar]");
  const malas = lineasSqlNoPermitidas(readFileSync(archivo, "utf8"), modo === "restaurar" ? SQL_RESTAURAR_PERMITIDO : SQL_COORDENADAS_PERMITIDO);
  if (malas.length) {
    console.error(`Líneas no permitidas en ${archivo}:\n${malas.join("\n")}`);
    process.exit(1);
  }
  console.log(`${archivo}: solo líneas permitidas.`);
}

(async () => {
  if (cmd === "plan") await plan(rest);
  else if (cmd === "restaurar") restaurar(rest);
  else if (cmd === "validar") validar(rest);
  else {
    console.log("Uso: geo-coordenadas-ciudad.ts plan|restaurar|validar …");
    process.exit(1);
  }
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
