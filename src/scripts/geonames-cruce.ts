/**
 * REQ-085 (gate 3: cruce automático + revisión). Lo corre el workflow «Identidad (ensayo)».
 *   npx tsx src/scripts/geonames-cruce.ts <cities15000.txt> <carpeta-export> <carpeta-salida>
 * Cruza cada ciudad por país (ISO-2) + nombre + cercanía al centroide de los puntos de encuentro de sus tours.
 * Escribe geonames-auto.csv, geonames-revisar.csv (lo dudoso, para revisión manual), geonames.sql (solo los
 * automáticos, solo si la ciudad no tiene geonameid) y geonames-resumen.json. No toca la base.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildGeoIndex, centroid, matchCity, parseCoordinates, parseGeonamesLine, type GeoCity, type Point } from "../destinations/lib/geonames";
import { buildGeonameSql, cityName, toCsv, type CountryExport } from "../destinations/lib/dry-run";
import { iso2FromCountry } from "../destinations/lib/ids";

interface CityRow { id: number; countryId: number; translations: unknown; geonameid?: number | null }
interface TourRow { cityId: number; coords?: string | null }

function load<T>(file: string): T[] {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (Array.isArray(data) && data.length && data[0] && Array.isArray(data[0].results)) return data.flatMap((d: { results: T[] }) => d.results);
  return data as T[];
}

const [geoFile, input, out] = process.argv.slice(2);
if (!geoFile || !input || !out) {
  console.log("Uso: geonames-cruce.ts <cities15000.txt> <carpeta-export> <carpeta-salida>");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const geo: GeoCity[] = readFileSync(geoFile, "utf8").split("\n").flatMap((l) => parseGeonamesLine(l) ?? []);
const index = buildGeoIndex(geo);

const countries = load<CountryExport>(join(input, "countries.json"));
// ISO-2 del país: el guardado, o el calculado aunque esté pendiente por choque (aquí solo sirve para buscar).
const iso = new Map(countries.map((c) => [c.id, c.iso2 || iso2FromCountry({ code: c.code })]));

const points = new Map<number, Point[]>();
for (const t of load<TourRow>(join(input, "tours.json"))) {
  const p = parseCoordinates(t.coords);
  if (p) points.set(t.cityId, [...(points.get(t.cityId) ?? []), p]);
}

const rows = load<CityRow>(join(input, "cities.json")).map((c) => {
  const t = (c.translations && typeof c.translations === "string" ? JSON.parse(c.translations) : c.translations) as Record<string, string> | null;
  const names = [...new Set([cityName(c.translations), ...Object.values(t ?? {})].filter((n) => typeof n === "string" && n))];
  const at = centroid(points.get(c.id) ?? []);
  const m = matchCity({ names, iso2: iso.get(c.countryId) ?? null, centroid: at }, index);
  return {
    cityId: c.id,
    pais: iso.get(c.countryId) ?? "",
    nombre: names[0] ?? "",
    tours_con_punto: points.get(c.id)?.length ?? 0,
    centroide: at ? `${at.lat.toFixed(5)},${at.lng.toFixed(5)}` : "",
    status: m.status,
    geonameid: m.geonameid,
    geonames_nombre: m.name ?? "",
    admin1: m.admin1 ?? "",
    distancia_km: m.distanceKm ?? "",
    motivo: m.reason,
    ya_tiene: c.geonameid ?? "",
  };
});

const auto = rows.filter((r) => r.status === "auto");
const review = rows.filter((r) => r.status !== "auto");
writeFileSync(join(out, "geonames-auto.csv"), toCsv(auto));
writeFileSync(join(out, "geonames-revisar.csv"), toCsv(review));
writeFileSync(join(out, "geonames.sql"), `-- Ola 3: geonameid automáticos (gate 3). Solo llena ciudades sin geonameid.\n${buildGeonameSql(rows)}`);
const resumen = {
  geonames: geo.length,
  ciudades: rows.length,
  auto: auto.length,
  revisar: rows.filter((r) => r.status === "revisar").length,
  sinCandidato: rows.filter((r) => r.status === "sin-candidato").length,
  pctAuto: rows.length ? Math.round((auto.length / rows.length) * 1000) / 10 : 0,
};
writeFileSync(join(out, "geonames-resumen.json"), JSON.stringify(resumen, null, 2));
console.log(`GeoNames: ${resumen.geonames} ciudades. FREETOUR: ${resumen.ciudades}. Automáticas ${resumen.auto} (${resumen.pctAuto} %), revisar ${resumen.revisar}, sin candidato ${resumen.sinCandidato}.`);
