/**
 * REQ-974: aviso a IndexNow justo después de publicar una entrada del blog. Solo si la bandera está encendida en
 * producción: la clave es pública por diseño y se lee de /indexnow-key.txt (apagada = 404 = no se manda nada).
 *   npx tsx src/scripts/blog-indexnow.ts <ruta del artículo, p. ej. /blog/europa/mi-entrada>
 */
import { indexNowConfig, submitIndexNow } from "../seo/lib/indexnow";
import { registryPosts } from "../blog/diario-run";
import { postPath } from "../blog/lib/registry";
import { blogIndexNowUrls } from "../blog/lib/seo";

(async () => {
  const site = (process.env.SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, "");
  const path = process.argv[2] ?? "";
  const post = registryPosts().find((p) => postPath(p) === path);
  if (!post) { console.error(`[indexnow] no hay artículo en ${path}`); process.exit(1); }
  const res = await fetch(`${site}/indexnow-key.txt`).catch(() => null);
  const cfg = res?.ok ? indexNowConfig({ INDEXNOW_ENABLED: "true", INDEXNOW_KEY: (await res.text()).trim() }) : null;
  if (!cfg) { console.log(JSON.stringify({ skipped: "indexnow_disabled" })); return; }
  console.log(JSON.stringify(await submitIndexNow({ siteUrl: site, key: cfg.key, urls: blogIndexNowUrls(post, site) }, fetch)));
})();
