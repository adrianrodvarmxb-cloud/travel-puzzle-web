/**
 * REQ-1232: CLI de guias-ciudad.yml.
 *   npx tsx src/scripts/guias-ciudad.ts validar <guias.json> [--agregar] [--hoy AAAA-MM-DD] [--salida resultado.json]
 * El archivo trae un arreglo de 1 o 2 guías. Valida contra producción (sitemaps y página de la ciudad) y el registro;
 * con --agregar las suma a src/destinations/content/guias.json (único archivo que cambia).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { validateGuidesAgainstSite } from "../destinations/guias-run";
import { guideCityPath, type CityGuideInput } from "../destinations/lib/guia";

const FILE = "src/destinations/content/guias.json";
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const [cmd, file] = args;

(async () => {
  if (cmd !== "validar" || !file) { console.error("Uso: npx tsx src/scripts/guias-ciudad.ts validar <guias.json> [--agregar] [--hoy AAAA-MM-DD] [--salida archivo]"); process.exit(2); }
  const site = (process.env.SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, "");
  const out = (o: object) => { const s = JSON.stringify(o, null, 2); console.log(s); const f = flag("--salida"); if (f) writeFileSync(f, s); };
  let input: CityGuideInput[];
  try { input = JSON.parse(readFileSync(file, "utf8")); } catch (e) { out({ ok: false, problems: [`el archivo no es JSON válido: ${(e as Error).message}`] }); process.exit(1); }
  const r = await validateGuidesAgainstSite(input, { siteUrl: site, fetch: (u) => fetch(u), now: new Date(), today: flag("--hoy") });
  if (!r.ok) { out({ ok: false, problems: r.problems }); process.exit(1); }
  if (args.includes("--agregar")) {
    const list = JSON.parse(readFileSync(FILE, "utf8")) as CityGuideInput[];
    writeFileSync(FILE, `${JSON.stringify([...list, ...input], null, 2)}\n`);
  }
  out({ ok: true, fecha: r.guides[0].publishedAt, ciudades: r.guides.map((g) => g.nombre).join(" y "), rutas: r.guides.map(guideCityPath), urls: r.guides.map((g) => `${site}${guideCityPath(g)}`) });
})().catch((e) => { console.error(JSON.stringify({ ok: false, problems: [`error al validar: ${(e as Error).message}`] })); process.exit(1); });
