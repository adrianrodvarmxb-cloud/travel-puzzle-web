/**
 * REQ-586: IndexNow (Bing y los demás motores adheridos; Google no participa) tras INDEXNOW_ENABLED="false".
 * Puro salvo `submitIndexNow`, que recibe el fetch por parámetro. La clave es pública por diseño (se sirve en
 * /indexnow-key.txt), pero vive en la variable INDEXNOW_KEY: este código no la crea ni la escribe.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";
const MAX_URLS = 10_000;
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

// REQ-586: solo "true" exacto y una clave con el formato de IndexNow.
export function indexNowConfig(env: { INDEXNOW_ENABLED?: string; INDEXNOW_KEY?: string }): { key: string } | null {
  const key = (env.INDEXNOW_KEY ?? "").trim();
  return env.INDEXNOW_ENABLED === "true" && KEY_RE.test(key) ? { key } : null;
}

// REQ-586: URLs de los sitemaps (ya armados) cuyo lastmod es `since` (AAAA-MM-DD) o posterior.
export function changedUrls(files: Record<string, string>, since: string): string[] {
  const out: string[] = [];
  for (const xml of Object.values(files)) {
    for (const m of xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)) {
      if (m[2] && m[2].slice(0, 10) >= since) out.push(m[1].replace(/&amp;/g, "&"));
    }
  }
  return out;
}

// REQ-586
export function indexNowRequest({ siteUrl, key, urls }: { siteUrl: string; key: string; urls: string[] }) {
  const site = siteUrl.replace(/\/+$/, "");
  const host = new URL(site).host;
  const own = [...new Set(urls.filter((u) => { try { return new URL(u).host === host; } catch { return false; } }))].slice(0, MAX_URLS);
  if (!own.length) return null;
  return { endpoint: INDEXNOW_ENDPOINT, body: { host, key, keyLocation: `${site}${INDEXNOW_KEY_PATH}`, urlList: own } };
}

// REQ-586: un error de IndexNow se registra y no se propaga.
export async function submitIndexNow(o: { siteUrl: string; key: string; urls: string[] }, fetchFn: typeof fetch): Promise<{ sent: number; status: number | null; error?: string }> {
  const req = indexNowRequest(o);
  if (!req) return { sent: 0, status: null };
  try {
    const res = await fetchFn(req.endpoint, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(req.body) });
    return { sent: req.body.urlList.length, status: res.status };
  } catch (e) {
    return { sent: 0, status: null, error: (e as Error).message };
  }
}
