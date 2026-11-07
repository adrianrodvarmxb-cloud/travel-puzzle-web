/**
 * REQ-586: raíz de la corrida de IndexNow. Recibe sus dependencias (sitemaps armados, fetch, entorno, reloj) por
 * parámetro; la lógica vive en lib/indexnow.ts. Tras INDEXNOW_ENABLED="false": apagada no hace nada.
 */
import { changedUrls, indexNowConfig, submitIndexNow } from "./lib/indexnow";

type Env = { INDEXNOW_ENABLED?: string; INDEXNOW_KEY?: string };

// REQ-586: una vez al día; manda lo que cambió desde ayer (lastmod real de los sitemaps).
export async function runIndexNow(d: { env: Env; siteUrl: string; now: Date; getFiles: () => Promise<Record<string, string>>; fetch: typeof fetch }) {
  const cfg = indexNowConfig(d.env);
  if (!cfg) return { skipped: "indexnow_disabled" as const };
  const since = new Date(d.now.getTime() - 864e5).toISOString().slice(0, 10);
  const urls = changedUrls(await d.getFiles(), since);
  const r = await submitIndexNow({ siteUrl: d.siteUrl, key: cfg.key, urls }, d.fetch);
  if (r.error) console.error("[indexnow]", r.error);
  return r;
}

// REQ-586: archivo de la clave (keyLocation). Apagada o sin clave: 404.
export function keyFileResponse(env: Env): Response {
  const cfg = indexNowConfig(env);
  return cfg
    ? new Response(cfg.key, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } })
    : new Response("Not found", { status: 404 });
}
