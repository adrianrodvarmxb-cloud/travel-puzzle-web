/**
 * REQ-131…137: ensayo del cruce v2 de identidad geográfica. Lo corre el workflow «Identidad geográfica v2 (ensayo)».
 *   npx tsx src/scripts/geo-cruce-v2.ts <cities500.txt> <alt-es-en.tsv> <carpeta-export> <carpeta-salida> [--cities15000 <txt>] [--wikidata]
 * Lee en streaming; la lógica está en src/geo/lib. No toca la base: escribe CSV, SQL y un resumen en <carpeta-salida>.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { toCsv, cityName } from "../destinations/lib/dry-run";
import { buildGeoIndex, centroid, matchCity, parseCoordinates, parseGeonamesLine, type Point as V1Point } from "../destinations/lib/geonames";
import { iso2FromCountry } from "../destinations/lib/ids";
import { parseCityAliases } from "../geo/lib/alias";
import { parseAnCities, parseCountryOverrides, mapCountry } from "../geo/lib/country";
import { buildGeoV2PendingSql, buildGeoV2Sql, planGeoV2, reviewCsvRows } from "../geo/lib/dry-run-v2";
import { buildIndex, parseAltNameLine, parseCityLine, type AltName, type GeoPlace } from "../geo/lib/geonames-v2";
import { parseCityOverrides } from "../geo/lib/resolve";
import { WDQS_URL, WIKIDATA_BATCH, WIKIDATA_USER_AGENT, buildWikidataQuery, parseWikidataResponse, type WdItem } from "../geo/lib/wikidata";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);
const [citiesFile, altFile, input, out] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--cities15000"));
if (!citiesFile || !altFile || !input || !out) {
  console.log("Uso: geo-cruce-v2.ts <cities500.txt> <alt-es-en.tsv> <carpeta-export> <carpeta-salida> [--cities15000 <txt>] [--wikidata]");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

function load<T>(file: string): T[] {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (Array.isArray(data) && data.length && data[0] && Array.isArray(data[0].results)) return data.flatMap((d: { results: T[] }) => d.results);
  return data as T[];
}

async function* lines(file: string) {
  for await (const l of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) yield l;
}

const DATA = join(process.cwd(), "src/geo/data");
const read = (f: string) => readFileSync(join(DATA, f), "utf8");
const overrides = {
  countries: parseCountryOverrides(read("country-overrides.csv")),
  an: parseAnCities(read("an-cities.csv")),
  aliases: parseCityAliases(read("city-aliases.csv")),
  cities: parseCityOverrides(read("city-overrides.csv")),
};

const countries = load<{ id: number; code: string }>(join(input, "countries.json"));
const cities = load<{ id: number; countryId: number; translations: unknown; geonameid?: number | null }>(join(input, "cities.json"));
const tours = load<{ cityId: number; coords?: string | null }>(join(input, "tours.json"));

// Solo se indexan los países del catálogo (más CW/SX/BQ/AW por AN).
const wanted = new Set<string>(["CW", "SX", "BQ", "AW"]);
for (const c of countries) {
  const m = mapCountry(c, overrides.countries);
  if (m.countryCode) wanted.add(m.countryCode);
}

async function main() {
  const t0 = Date.now();
  const places: GeoPlace[] = [];
  for await (const l of lines(citiesFile)) {
    const p = parseCityLine(l);
    if (p && wanted.has(p.countryCode)) places.push(p);
  }
  const alts: AltName[] = [];
  for await (const l of lines(altFile)) {
    const a = parseAltNameLine(l);
    if (a) alts.push(a);
  }
  const index = buildIndex(places, alts, wanted);
  console.log(`GeoNames: ${index.places.size} lugares de ${wanted.size} países, ${alts.length} nombres es/en/wkdt (${Math.round((Date.now() - t0) / 1000)} s).`);

  // «Antes»: la receta v1 (cities15000 + filtro duro de distancia) sobre los mismos datos.
  let baseline: Map<number, string> | undefined;
  const c15 = opt("--cities15000");
  if (c15) {
    const geo = readFileSync(c15, "utf8").split("\n").flatMap((l) => parseGeonamesLine(l) ?? []);
    const v1 = buildGeoIndex(geo);
    const iso = new Map(countries.map((c) => [c.id, iso2FromCountry({ code: c.code })]));
    const pts = new Map<number, V1Point[]>();
    for (const t of tours) {
      const p = parseCoordinates(t.coords);
      if (p) pts.set(t.cityId, [...(pts.get(t.cityId) ?? []), p]);
    }
    baseline = new Map(
      cities.map((c) => {
        const tr = typeof c.translations === "string" ? JSON.parse(c.translations) : c.translations;
        const names = [...new Set([cityName(c.translations), ...Object.values((tr ?? {}) as Record<string, string>)].filter((n) => typeof n === "string" && n))];
        return [c.id, matchCity({ names, iso2: iso.get(c.countryId) ?? null, centroid: centroid(pts.get(c.id) ?? []) }, v1).status];
      }),
    );
  }

  let plan = planGeoV2({ countries, cities, tours, index, overrides, baseline });

  if (flag("--wikidata")) {
    // Segunda opinión solo para lo que no es automático. Lotes en serie, con pausa, User-Agent genérico.
    const pending = plan.rows.filter((r) => (r.status === "revisar" || r.status === "sin-candidato") && r.countryCode);
    const wd = new Map<number, WdItem[]>();
    let failed = 0;
    for (let i = 0; i < pending.length; i += WIKIDATA_BATCH) {
      const batch = pending.slice(i, i + WIKIDATA_BATCH).map((r) => ({ cityId: r.cityId, iso2: r.countryCode!, labels: r.names.slice(0, 2) }));
      let ok = false;
      for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        try {
          const res = await fetch(WDQS_URL, {
            method: "POST",
            headers: { "User-Agent": WIKIDATA_USER_AGENT, Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ query: buildWikidataQuery(batch) }),
            signal: AbortSignal.timeout(65_000),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          for (const [k, v] of parseWikidataResponse(await res.json())) wd.set(k, v);
          for (const b of batch) if (!wd.has(b.cityId)) wd.set(b.cityId, []);
          ok = true;
        } catch (e) {
          console.log(`Wikidata: lote ${i / WIKIDATA_BATCH + 1}, intento ${attempt}: ${(e as Error).message}`);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
      if (!ok) failed++;
      await new Promise((r) => setTimeout(r, 1500));
    }
    console.log(`Wikidata: ${wd.size} ciudades consultadas, ${failed} lotes fallidos.`);
    plan = planGeoV2({ countries, cities, tours, index, overrides, baseline, wikidata: wd });
  }

  const review = plan.rows.filter((r) => r.status === "revisar" || r.status === "sin-candidato");
  writeFileSync(join(out, "geo-v2-revisar.csv"), toCsv(reviewCsvRows(review)));
  writeFileSync(join(out, "geo-v2-auto.csv"), toCsv(reviewCsvRows(plan.rows.filter((r) => r.status === "auto"))));
  writeFileSync(join(out, "geo-v2-sin-pagina.csv"), toCsv(reviewCsvRows(plan.rows.filter((r) => r.status === "sin-pagina"))));
  writeFileSync(join(out, "geo-v2-control-difieren.csv"), toCsv(reviewCsvRows(plan.rows.filter((r) => r.controlDiff))));
  writeFileSync(join(out, "geo-v2-alias-sugeridos.csv"), toCsv(plan.aliasSuggestions.map((s) => ({ ids: s.ids.join(" "), pais: s.iso2, llave: s.key }))));
  writeFileSync(join(out, "geo-v2.sql"), buildGeoV2Sql(plan));
  writeFileSync(join(out, "geo-v2-0016.sql"), buildGeoV2PendingSql(plan));
  writeFileSync(join(out, "geo-v2-resumen.json"), JSON.stringify(plan.summary, null, 2));
  const s = plan.summary;
  console.log(
    `Ciudades ${s.ciudades}. Antes (v1): ${s.antes ? `${s.antes.auto} auto, ${s.antes.revisar} revisar, ${s.antes.sinCandidato} sin candidato` : "sin dato"}. ` +
      `Regla v2: ${s.reglaV2.auto} auto (${s.reglaV2.pctAuto} %), ${s.reglaV2.revisar} revisar, ${s.reglaV2.sinCandidato} sin candidato. ` +
      `Final: ${s.despues.auto} auto, ${s.despues.revisar} revisar, ${s.despues.sinCandidato} sin candidato, ${s.sinPagina} sin página. ` +
      `Control: ${s.control.conGeonameid} con geonameid, ${s.control.difieren} difieren.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
