/**
 * REQ-1075, REQ-1081: CLI del workflow redes-diario.yml.
 *   npx tsx src/scripts/redes-diario.ts <ruta del artículo> [--salida carpeta]
 * Arma los textos de LinkedIn, Facebook e Instagram de la entrada publicada, los valida y publica en cada red con su
 * bandera encendida y sus secretos; las demás quedan «manual». Escribe en la carpeta: linkedin.txt, facebook.txt,
 * instagram.txt, laminas.txt, issue.md y resultado.json. Sale con 1 si alguna red falló.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { registryPosts } from "../blog/diario-run";
import { postPath } from "../blog/lib/registry";
import { wranglerVars } from "../site/lib/pages";
import { redesConfig } from "../redes/lib/api";
import { runRedes, issueRedesDelDia, type Historial } from "../redes/run";
import { execFileSync } from "node:child_process";

/** REQ-1090: historial en D1 (tabla RedPublicacion). Sin base legible, el publicador no publica (falla cerrada). */
function historialD1(slug: string): Historial {
  const q = (sql: string): Record<string, unknown>[] => {
    let out: string;
    try {
      out = execFileSync("npx", ["wrangler", "d1", "execute", "travel-puzzle", "--remote", "--json", "--command", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      const err = e as { stderr?: string; stdout?: string };
      throw new Error(`wrangler d1: ${(err.stderr || err.stdout || "").trim().slice(0, 1500)}`);
    }
    const r = JSON.parse(out) as { results?: Record<string, unknown>[] }[];
    return r[0]?.results ?? [];
  };
  const esc = (v: string) => v.replace(/'/g, "''");
  return {
    async yaPublicadoEnRed(red) { return Number(q(`SELECT COUNT(*) AS n FROM "RedPublicacion" WHERE "slug" = '${esc(slug)}' AND "red" = '${red}'`)[0]?.n ?? 0) > 0; },
    async registrar(red) { q(`INSERT OR IGNORE INTO "RedPublicacion" ("slug","red","publicadoEn") VALUES ('${esc(slug)}','${red}',datetime('now'))`); },
  };
}

(async () => {
  const args = process.argv.slice(2);
  const ruta = args[0] ?? "";
  const i = args.indexOf("--salida");
  const dir = i >= 0 ? args[i + 1] : "redes-salida";
  const site = (process.env.SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, "");
  const post = registryPosts().find((p) => postPath(p) === ruta && !p.draft);
  if (!post) { console.error(`no hay entrada publicada en ${ruta}`); process.exit(1); }
  const config = redesConfig(wranglerVars(readFileSync("wrangler.jsonc", "utf8")), process.env as Record<string, string | undefined>);
  const r = await runRedes({ post, siteUrl: site, config, fetch: (u, init) => fetch(u, init), historial: historialD1(post.slug) });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "linkedin.txt"), `${r.pack.linkedin}\n`);
  writeFileSync(join(dir, "facebook.txt"), `${r.pack.facebook}\n`);
  writeFileSync(join(dir, "instagram.txt"), `${r.pack.instagram.caption}\n`);
  writeFileSync(join(dir, "laminas.txt"), `${r.laminas.join("\n")}\n`);
  const issue = (r.problemas.length ? `**NO PUBLICAR: los textos no pasan las reglas del blog.**\n${r.problemas.map((p) => `- ${p}`).join("\n")}\n\n` : "") + issueRedesDelDia({ ...r, post, url: `${site}${ruta}` });
  writeFileSync(join(dir, "issue.md"), issue);
  writeFileSync(join(dir, "resultado.json"), JSON.stringify({ titulo: post.title, fecha: post.publishedAt, slug: post.slug, problemas: r.problemas, resultados: r.resultados }, null, 2));
  for (const x of r.resultados) console.log(`${x.red}: ${x.estado} — ${x.detalle}`);
  if (r.problemas.length || r.resultados.some((x) => x.estado === "fallo")) process.exit(1);
})();
