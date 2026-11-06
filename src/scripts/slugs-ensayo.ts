/**
 * REQ-085/086/087 (Ola 3): ensayo de slugs de todo el catálogo. Lo corre el workflow «Identidad (ensayo)».
 *   npx tsx src/scripts/slugs-ensayo.ts <carpeta-export> <carpeta-salida>
 * Lee countries.json, cities.json y tours.json (exportados de D1 en solo lectura) y escribe:
 *   identidad.sql (solo llena columnas vacías), reporte.json, ciudades-pendientes.csv, paises-pendientes.csv.
 * No toca la base. Sale con código 1 si hay slugs duplicados (meta firmada: 0).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildIdentitySql, planIdentity, toCsv, type CityExport, type CountryExport, type TourExport } from "../destinations/lib/dry-run";

/** Acepta un arreglo o la salida de `wrangler d1 execute --json` ([{ results: [...] }]). */
function load<T>(file: string): T[] {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (Array.isArray(data) && data.length && data[0] && Array.isArray(data[0].results)) return data.flatMap((d: { results: T[] }) => d.results);
  return data as T[];
}

const [input, out] = process.argv.slice(2);
if (!input || !out) {
  console.log("Uso: slugs-ensayo.ts <carpeta-export> <carpeta-salida>");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const plan = planIdentity({
  countries: load<CountryExport>(join(input, "countries.json")),
  cities: load<CityExport>(join(input, "cities.json")),
  tours: load<TourExport>(join(input, "tours.json")),
});

writeFileSync(join(out, "identidad.sql"), buildIdentitySql(plan));
writeFileSync(join(out, "reporte.json"), JSON.stringify(plan.report, null, 2));
writeFileSync(join(out, "ciudades-pendientes.csv"), toCsv(plan.report.cityPending));
writeFileSync(join(out, "paises-pendientes.csv"), toCsv(plan.report.countries.pending));

const r = plan.report;
console.log(`Países: ${r.countries.total} (pendientes ${r.countries.pending.length})`);
console.log(`Ciudades: ${r.cities.total} (guardados ${r.cities.kept}, nuevos ${r.cities.new}, pendientes ${r.cities.pending})`);
console.log(`Tours: ${r.tours.total} (guardados ${r.tours.kept}, nuevos ${r.tours.new}, con sufijo ${r.tours.withSuffix}, de reserva ${r.tours.fallback}, pendientes ${r.tours.pending})`);
console.log(`Duplicados: tours ${r.tourDuplicates.length}, ciudades ${r.cityDuplicates.length}`);
if (r.tourDuplicates.length || r.cityDuplicates.length) process.exit(1);
