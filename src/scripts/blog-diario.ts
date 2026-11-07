/**
 * REQ-975: CLI del workflow blog-diario.yml.
 *   npx tsx src/scripts/blog-diario.ts validar <entrada.json> [--agregar] [--hoy AAAA-MM-DD] [--salida resultado.json]
 * Valida la entrada contra producción (sitemaps y fichas) y el registro; con --agregar la suma a
 * src/blog/content/diario.json (único archivo que cambia). Sale con 1 y la lista de motivos si no pasa.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { validateAgainstSite } from "../blog/diario-run";
import { postPath } from "../blog/lib/registry";
import { wranglerVars } from "../site/lib/pages";
import type { PostInput } from "../blog/lib/schema";

const DIARIO = "src/blog/content/diario.json";
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const [cmd, file] = args;

(async () => {
  if (cmd !== "validar" || !file) { console.error("Uso: npx tsx src/scripts/blog-diario.ts validar <entrada.json> [--agregar] [--hoy AAAA-MM-DD] [--salida archivo]"); process.exit(2); }
  const site = (process.env.SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, "");
  const vars = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
  const out = (o: object) => { const s = JSON.stringify(o, null, 2); console.log(s); const f = flag("--salida"); if (f) writeFileSync(f, s); };
  let input: PostInput;
  try { input = JSON.parse(readFileSync(file, "utf8")); } catch (e) { out({ ok: false, problems: [`la entrada no es JSON válido: ${(e as Error).message}`] }); process.exit(1); }
  const r = await validateAgainstSite(input, { siteUrl: site, fetch: (u) => fetch(u), now: new Date(), today: flag("--hoy"), primeraPieza: vars.PRIMERA_PIEZA_ENABLED === "true" });
  if (!r.ok) { out({ ok: false, problems: r.problems }); process.exit(1); }
  if (args.includes("--agregar")) {
    const list = JSON.parse(readFileSync(DIARIO, "utf8")) as PostInput[];
    list.push(input);
    writeFileSync(DIARIO, `${JSON.stringify(list, null, 2)}\n`);
  }
  const path = postPath(r.post);
  out({ ok: true, slug: r.post.slug, pillar: r.post.pillar, title: r.post.title, mix: r.post.mix, fecha: r.post.publishedAt, path, url: `${site}${path}` });
})().catch((e) => { console.error(JSON.stringify({ ok: false, problems: [`error al validar: ${(e as Error).message}`] })); process.exit(1); });
